import { Router } from 'express';
import prisma from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { config } from '../env.js';
import { createCheckoutSession, retrieveCheckoutSession, constructWebhookEvent } from '../services/stripe.js';
import { getActiveOffers, getOfferApplication } from '../services/offers.js';
import { calculateOrderTotals, calculateLineSubtotal } from '../utils/money.js';
import { writeAuditLog } from '../services/audit.js';
import { serializeOrder } from '../serializers.js';
import { sendOrderConfirmation } from '../services/email.js';
import { logger } from '../services/logger.js';
import { normalizeItems, getCheckoutSnapshot, nextOrderFolio } from '../utils/orderHelpers.js';

const router = Router();

// Stripe redirects the browser back to the app after payment. Use the actual
// frontend origin (so it works in dev where the SPA runs on :5173, not the API
// port), but only if it is a trusted origin; otherwise fall back to PUBLIC_APP_URL.
function resolveAppOrigin(req) {
  const origin = req.get('origin');
  if (origin && config.frontendOrigins.includes(origin)) return origin;
  return process.env.PUBLIC_APP_URL || config.frontendOrigins[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/checkout-session
// Validates cart, stores pending checkout, creates Stripe Checkout Session.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payments/checkout-session', requireAuth, requireRole('client'), async (req, res, next) => {
  try {
    if (!req.user.customer?.isAuthorized) {
      return res.status(403).json({ message: 'Tu cuenta aún no está autorizada para generar pedidos. Comunícate con un agente de ventas.' });
    }

    const normalized = normalizeItems(req.body.items);
    if (normalized.error) return res.status(400).json({ message: normalized.error });

    const checkout = getCheckoutSnapshot(req.body.checkout, req.user);
    if (checkout.error) return res.status(400).json({ message: checkout.error });

    // Validate products + calculate prices server-side (never trust frontend prices)
    const productIds = normalized.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { laboratory: true },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    for (const item of normalized.items) {
      const product = productsById.get(item.productId);
      if (!product) return res.status(400).json({ message: 'Uno de los productos ya no está disponible.' });
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Stock insuficiente para ${product.commercialName}.` });
      }
    }

    const activeOffers = await getActiveOffers(prisma);
    const priceDetails = normalized.items.map((item) => {
      const product = productsById.get(item.productId);
      const offerApplication = getOfferApplication(product, activeOffers);
      const unitPriceCents = offerApplication?.finalPriceCents ?? product.priceCents;
      return {
        productId: item.productId,
        quantity: item.quantity,
        name: product.commercialName,
        unitPriceCents,
        originalUnitPriceCents: product.priceCents,
        discountAmountCents: offerApplication?.discountAmountCents || 0,
        offerTitle: offerApplication?.offer.title || null,
      };
    });

    const totals = calculateOrderTotals(priceDetails);

    // Store cart + checkout in DB tied to the Stripe session ID (set after session creation)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const pending = await prisma.pendingCheckout.create({
      data: {
        userId: req.user.id,
        stripeSessionId: 'PENDING', // updated after Stripe responds
        cartJson: JSON.stringify(normalized.items),
        checkoutJson: JSON.stringify(checkout.data),
        observations: req.body.observations?.trim() || null,
        expiresAt,
      },
    });

    const appUrl = resolveAppOrigin(req);

    const stripeSession = await createCheckoutSession({
      lineItems: priceDetails.map((item) => ({
        name: item.name,
        unitAmountCents: item.unitPriceCents,
        quantity: item.quantity,
      })),
      customerEmail: checkout.data.clientEmail,
      pendingCheckoutId: pending.id,
      successUrl: `${appUrl}/#/pedido-confirmado?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/#/checkout`,
    });

    // Update the pending checkout with the real Stripe session ID
    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: { stripeSessionId: stripeSession.id },
    });

    return res.json({ url: stripeSession.url, sessionId: stripeSession.id });
  } catch (error) {
    return next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/by-session/:sessionId
// Lets the confirmation page poll for the order after Stripe redirects back.
// ─────────────────────────────────────────────────────────────────────────────
const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
  customer: true,
  items: { orderBy: { id: 'asc' } },
};

router.get('/orders/by-session/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const order = await prisma.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: orderInclude,
    });

    if (!order) return res.status(404).json({ message: 'Pedido no encontrado aún.' });

    // Clients may only see their own orders
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    return res.json({ order: serializeOrder(order) });
  } catch (error) {
    return next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/webhook
// Stripe calls this after a payment event. Body must be raw (no JSON parse).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payments/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = constructWebhookEvent(req.body, signature);
  } catch (error) {
    logger.warn('Stripe webhook signature invalid', { message: error.message });
    return res.status(400).json({ message: 'Firma de webhook inválida.' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await finalizeCheckoutSession(session).catch((error) => {
      // Log but don't fail the webhook response — Stripe retries on non-2xx
      logger.error('Error processing checkout.session.completed', {
        sessionId: session.id,
        name: error.name,
        message: error.message,
      });
    });
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    await prisma.pendingCheckout
      .deleteMany({ where: { stripeSessionId: session.id } })
      .catch(() => {});
  }

  return res.json({ received: true });
});

// Creates the paid order from its PendingCheckout. Idempotent and safe to call from
// both the Stripe webhook and the success-page confirm endpoint: if the order already
// exists (or is created concurrently), the existing order is returned. Returns the
// order, or null when there is no matching pending checkout.
// Exported for testing (the webhook passes the Stripe event's session object directly).
export async function finalizeCheckoutSession(session) {
  const alreadyCreated = await prisma.order.findUnique({
    where: { stripeSessionId: session.id },
    include: orderInclude,
  });
  if (alreadyCreated) return alreadyCreated;

  const pending = await prisma.pendingCheckout.findUnique({
    where: { stripeSessionId: session.id },
    include: { user: { include: { customer: true } } },
  });

  if (!pending) {
    logger.error('PendingCheckout not found for Stripe session', { sessionId: session.id });
    return null;
  }

  const { user } = pending;
  const cart = JSON.parse(pending.cartJson);
  const checkoutData = JSON.parse(pending.checkoutJson);
  const observations = pending.observations || null;

  // Re-validate and price products inside a transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    const productIds = cart.map((item) => item.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { laboratory: true },
    });
    const productsById = new Map(products.map((p) => [p.id, p]));

    const activeOffers = await getActiveOffers(tx);
    const priceDetails = cart.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) throw new Error(`Producto ${item.productId} no disponible.`);
      const offerApplication = getOfferApplication(product, activeOffers);
      const unitPriceCents = offerApplication?.finalPriceCents ?? product.priceCents;
      return {
        productId: item.productId,
        quantity: item.quantity,
        product,
        unitPriceCents,
        originalUnitPriceCents: product.priceCents,
        discountAmountCents: offerApplication?.discountAmountCents || 0,
        offerTitle: offerApplication?.offer.title || null,
      };
    });

    const totals = calculateOrderTotals(priceDetails);

    // Decrement stock atomically
    for (const item of priceDetails) {
      const decremented = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (decremented.count !== 1) {
        // Stock depleted after payment — create order anyway, flag for admin
        logger.warn('Stock insuficiente post-pago — pedido creado para revisión manual', { product: item.product.commercialName });
      }
    }

    const folio = await nextOrderFolio(tx, new Date().getFullYear());

    const paymentMethodType = session.payment_method_configuration_details?.type
      || (session.payment_method_types || [])[0]
      || null;

    const order = await tx.order.create({
      data: {
        folio,
        userId: user.id,
        customerId: user.customer.id,
        ...checkoutData,
        status: 'PENDING_REVIEW',
        paymentStatus: 'PAID',
        stripeSessionId: session.id,
        paidAt: new Date(),
        paymentMethod: paymentMethodType,
        observations,
        ...totals,
        items: {
          create: priceDetails.map((item) => ({
            productId: item.product.id,
            sku: item.product.sku,
            productName: item.product.commercialName,
            laboratoryName: item.product.laboratory.name,
            presentation: item.product.presentation,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            originalUnitPriceCents: item.originalUnitPriceCents,
            discountAmountCents: item.discountAmountCents,
            offerTitle: item.offerTitle,
            subtotalCents: calculateLineSubtotal(item.unitPriceCents, item.quantity),
          })),
        },
      },
      include: orderInclude,
    });

    await tx.pendingCheckout.delete({ where: { id: pending.id } });

    // Must use the transaction client (tx); the global client would deadlock against
    // this transaction's write lock on SQLite and time out (Prisma P2028).
    await writeAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'Order',
      entityId: order.id,
      details: { folio: order.folio, stripeSession: session.id, paymentStatus: 'PAID' },
    }, tx);

    return order;
  });

  // Fire-and-forget — email failure must never affect the webhook 200 response
  if (createdOrder) {
    sendOrderConfirmation(serializeOrder(createdOrder)).catch(() => {});
  }
  return createdOrder;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/confirm
// Called by the success page after Stripe redirects back. Verifies the session is
// paid and creates the order immediately, so it works in local development without
// the webhook needing a public URL. The webhook remains the backup for production
// (e.g. if the customer closes the tab before the redirect completes).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payments/confirm', requireAuth, requireRole('client'), async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ message: 'Falta el identificador de la sesión de pago.' });
    }

    let order = await prisma.order.findUnique({ where: { stripeSessionId: sessionId }, include: orderInclude });

    if (!order) {
      let session;
      try {
        session = await retrieveCheckoutSession(sessionId);
      } catch {
        return res.status(404).json({ message: 'No se encontró la sesión de pago.' });
      }
      if (session.payment_status !== 'paid') {
        return res.status(409).json({ message: 'El pago aún no se ha confirmado. Si ya lo realizaste, espera unos segundos e intenta de nuevo.' });
      }
      try {
        order = await finalizeCheckoutSession(session);
      } catch (error) {
        // Lost a race with the webhook — the order now exists, fetch it.
        if (error.code !== 'P2002') throw error;
        order = await prisma.order.findUnique({ where: { stripeSessionId: sessionId }, include: orderInclude });
      }
      if (!order) return res.status(404).json({ message: 'No se encontró la información del pedido.' });
    }

    // Clients may only confirm/see their own order.
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    return res.json({ order: serializeOrder(order) });
  } catch (error) {
    return next(error);
  }
});

export default router;
