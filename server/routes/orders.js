import { Router } from 'express';
import prisma from '../db.js';
import { ORDER_STATUSES, isAllowed } from '../constants.js';
import { requireAuth, requireRole } from '../auth.js';
import { serializeOrder } from '../serializers.js';
import { getActiveOffers, getOfferApplication } from '../services/offers.js';
import { calculateOrderTotals, calculateLineSubtotal } from '../utils/money.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();

const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
  customer: true,
  items: { orderBy: { id: 'asc' } },
};
const CLIENT_CANCELLABLE_STATUS = 'PENDING_REVIEW';

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'El pedido debe incluir al menos un producto.' };
  }

  const quantities = new Map();
  for (const item of items) {
    const productId = item.productId;
    const quantity = Number.parseInt(item.quantity, 10);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return { error: 'Cada producto debe tener una cantidad válida.' };
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  return {
    items: Array.from(quantities, ([productId, quantity]) => ({ productId, quantity })),
  };
}

function buildOrderFolio(year, sequence) {
  return `PED-${year}-${String(sequence).padStart(4, '0')}`;
}

async function nextOrderFolio(tx, year) {
  let sequence = await tx.orderFolioSequence.upsert({
    where: { year },
    create: { year, nextValue: 1 },
    update: { nextValue: { increment: 1 } },
  });

  // Existing databases can contain orders created before OrderFolioSequence existed.
  // Advance safely until the persistent counter is beyond that legacy range.
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const folio = buildOrderFolio(year, sequence.nextValue);
    const existing = await tx.order.findUnique({ where: { folio }, select: { id: true } });
    if (!existing) return folio;
    sequence = await tx.orderFolioSequence.update({ where: { year }, data: { nextValue: { increment: 1 } } });
  }
  throw new Error('No fue posible asignar un folio único al pedido.');
}

function cleanText(value, fallback = '') {
  return value?.toString().trim() || fallback;
}

function getCheckoutSnapshot(checkout = {}, user) {
  const customer = user.customer;
  const snapshot = {
    clientName: cleanText(checkout.clientName, customer.businessName || user.name),
    clientEmail: cleanText(checkout.clientEmail, user.email),
    deliveryAddress: cleanText(checkout.deliveryAddress, customer.address),
    deliveryCity: cleanText(checkout.deliveryCity, customer.city),
    deliveryState: cleanText(checkout.deliveryState, customer.state),
    deliveryPostalCode: cleanText(checkout.deliveryPostalCode, customer.postalCode),
    billingBusinessName: cleanText(checkout.billingBusinessName, customer.businessName),
    billingRfc: cleanText(checkout.billingRfc, customer.rfc || ''),
    billingAddress: cleanText(checkout.billingAddress, customer.address),
    responsibleName: cleanText(checkout.responsibleName, customer.contactName),
    responsiblePhone: cleanText(checkout.responsiblePhone, customer.phone),
  };
  const requiredFields = [
    'deliveryAddress',
    'deliveryCity',
    'deliveryState',
    'deliveryPostalCode',
    'responsibleName',
    'responsiblePhone',
  ];
  const missingField = requiredFields.find((field) => !snapshot[field]);

  return missingField ? { error: `El campo ${missingField} es obligatorio.` } : { data: snapshot };
}

async function createOrder(req, res, next) {
  try {
    if (!req.user.customer || !req.user.customer.isAuthorized) {
      return res.status(403).json({ message: 'Tu cuenta aún no está autorizada para generar pedidos. Comunícate con un agente de ventas.' });
    }

    const normalized = normalizeItems(req.body.items);
    if (normalized.error) return res.status(400).json({ message: normalized.error });

    const checkout = getCheckoutSnapshot(req.body.checkout, req.user);
    if (checkout.error) return res.status(400).json({ message: checkout.error });

    const observations = req.body.observations?.trim() || null;
    const order = await prisma.$transaction(async (tx) => {
      const productIds = normalized.items.map((item) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: { laboratory: true },
      });
      const productsById = new Map(products.map((product) => [product.id, product]));

      for (const item of normalized.items) {
        const product = productsById.get(item.productId);
        if (!product) throw new Error('Uno de los productos ya no está disponible.');
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para ${product.commercialName}.`);
        }
      }

      const activeOffers = await getActiveOffers(tx);
      const priceDetailsByProductId = new Map(
        normalized.items.map((item) => {
          const product = productsById.get(item.productId);
          const offerApplication = getOfferApplication(product, activeOffers);
          const originalUnitPriceCents = product.priceCents;
          const discountAmountCents = offerApplication?.discountAmountCents || 0;
          const unitPriceCents = offerApplication?.finalPriceCents ?? originalUnitPriceCents;

          return [item.productId, {
            originalUnitPriceCents,
            discountAmountCents,
            unitPriceCents,
            offerTitle: offerApplication?.offer.title || null,
          }];
        }),
      );
      const totals = calculateOrderTotals(normalized.items.map((item) => ({
        ...priceDetailsByProductId.get(item.productId),
        quantity: item.quantity,
      })));
      for (const item of normalized.items) {
        const decremented = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (decremented.count !== 1) {
          throw new Error(`Stock insuficiente para ${productsById.get(item.productId).commercialName}.`);
        }
      }

      const folio = await nextOrderFolio(tx, new Date().getFullYear());

      return tx.order.create({
        data: {
          folio,
          userId: req.user.id,
          customerId: req.user.customer.id,
          ...checkout.data,
          status: 'PENDING_REVIEW',
          ...totals,
          observations,
          items: {
            create: normalized.items.map((item) => {
              const product = productsById.get(item.productId);
              const pricing = priceDetailsByProductId.get(item.productId);
              return {
                productId: product.id,
                sku: product.sku,
                productName: product.commercialName,
                laboratoryName: product.laboratory.name,
                presentation: product.presentation,
                quantity: item.quantity,
                unitPriceCents: pricing.unitPriceCents,
                originalUnitPriceCents: pricing.originalUnitPriceCents,
                discountAmountCents: pricing.discountAmountCents,
                offerTitle: pricing.offerTitle,
                subtotalCents: calculateLineSubtotal(pricing.unitPriceCents, item.quantity),
              };
            }),
          },
        },
        include: orderInclude,
      });
    });

    await writeAuditLog({ userId: req.user.id, action: 'CREATE', entity: 'Order', entityId: order.id, details: { folio: order.folio } });

    return res.status(201).json({ order: serializeOrder(order) });
  } catch (error) {
    if (error.message?.startsWith('Stock insuficiente') || error.message?.includes('no está disponible')) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

router.get('/orders', requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(serializeOrder) });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude });

    if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    return res.json({ order: serializeOrder(order) });
  } catch (error) {
    return next(error);
  }
});

router.post('/orders', requireAuth, requireRole('client'), createOrder);

router.patch('/orders/:id/cancel', requireAuth, requireRole('client'), async (req, res, next) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: req.params.id, userId: req.user.id },
        include: { items: true },
      });

      if (!order) return { notFound: true };
      if (order.status !== CLIENT_CANCELLABLE_STATUS) return { cannotCancel: true };

      // The conditional update prevents two requests from restoring stock twice.
      const updated = await tx.order.updateMany({
        where: { id: order.id, status: CLIENT_CANCELLABLE_STATUS },
        data: { status: 'CANCELLED' },
      });

      if (updated.count !== 1) return { cannotCancel: true };

      await Promise.all(
        order.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        ),
      );

      return {
        order: await tx.order.findUnique({
          where: { id: order.id },
          include: orderInclude,
        }),
      };
    });

    if (result.notFound) return res.status(404).json({ message: 'Pedido no encontrado.' });
    if (result.cannotCancel) {
      return res.status(409).json({
        message: 'Solo puedes cancelar solicitudes que siguen pendientes de revisi\u00f3n.',
      });
    }

    await writeAuditLog({ userId: req.user.id, action: 'CANCEL', entity: 'Order', entityId: result.order.id, details: { folio: result.order.folio } });

    return res.json({ order: serializeOrder(result.order) });
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/orders', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const where = req.query.status && isAllowed(req.query.status, ORDER_STATUSES)
      ? { status: req.query.status }
      : {};
    const orders = await prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders: orders.map(serializeOrder) });
  } catch (error) {
    next(error);
  }
});

router.patch('/admin/orders/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!isAllowed(status, ORDER_STATUSES)) {
      return res.status(400).json({ message: 'El estado no es válido.' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: orderInclude,
    });
    await writeAuditLog({ userId: req.user.id, action: 'STATUS_CHANGE', entity: 'Order', entityId: order.id, details: { status } });

    return res.json({ order: serializeOrder(order) });
  } catch (error) {
    return next(error);
  }
});

export default router;
