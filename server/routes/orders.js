import { Router } from 'express';
import prisma from '../db.js';
import { ORDER_STATUSES, isAllowed } from '../constants.js';
import { requireAuth, requireRole } from '../auth.js';
import { serializeOrder } from '../serializers.js';
import { getActiveOffers, getOfferApplication } from '../services/offers.js';
import { calculateOrderTotals, calculateLineSubtotal } from '../utils/money.js';
import { writeAuditLog } from '../services/audit.js';
import { sendOrderConfirmation, sendOrderStatusUpdate } from '../services/email.js';
import { normalizeItems, getCheckoutSnapshot, nextOrderFolio } from '../utils/orderHelpers.js';

const router = Router();

const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
  customer: true,
  items: { orderBy: { id: 'asc' } },
};
const CLIENT_CANCELLABLE_STATUS = 'PENDING_REVIEW';
// An order can only be adjusted while it is still open (before it is supplied or closed).
const ORDER_EDITABLE_STATUSES = ['PENDING_REVIEW', 'IN_REVIEW', 'APPROVED'];

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

    const serialized = serializeOrder(order);
    sendOrderConfirmation(serialized).catch(() => {}); // fire-and-forget
    return res.status(201).json({ order: serialized });
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

    // Capture previous status before updating so the email can show the transition
    const previous = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { status: true },
    });
    if (!previous) return res.status(404).json({ message: 'Pedido no encontrado.' });

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: orderInclude,
    });
    await writeAuditLog({ userId: req.user.id, action: 'STATUS_CHANGE', entity: 'Order', entityId: order.id, details: { status } });

    const serialized = serializeOrder(order);
    sendOrderStatusUpdate(serialized, previous.status).catch(() => {}); // fire-and-forget
    return res.json({ order: serialized });
  } catch (error) {
    return next(error);
  }
});

// Adjust the quantities of an order's lines (e.g. when physical stock is short of
// what the client requested). Quantities can only be reduced or set to 0 to drop a
// line; totals are recalculated from the stored per-unit prices. Product stock is
// intentionally left untouched: the missing units do not exist, so returning them to
// inventory would create phantom stock — adjust the product's real stock separately.
router.patch('/admin/orders/:id/items', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const updates = req.body.items;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Debes indicar al menos una partida a modificar.' });
    }

    const parsedUpdates = [];
    for (const update of updates) {
      const quantity = Number.parseInt(update?.quantity, 10);
      if (!update?.id || !Number.isInteger(quantity) || quantity < 0) {
        return res.status(400).json({ message: 'Cada partida debe incluir un identificador y una cantidad válida (entero mayor o igual a 0).' });
      }
      parsedUpdates.push({ id: String(update.id), quantity });
    }

    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!current) throw Object.assign(new Error('Pedido no encontrado.'), { status: 404 });
      if (!ORDER_EDITABLE_STATUSES.includes(current.status)) {
        throw Object.assign(new Error('Solo puedes ajustar pedidos pendientes, en revisión o aprobados.'), { status: 409 });
      }

      const itemsById = new Map(current.items.map((item) => [item.id, item]));
      for (const update of parsedUpdates) {
        const item = itemsById.get(update.id);
        if (!item) throw Object.assign(new Error('Una de las partidas no pertenece a este pedido.'), { status: 400 });
        if (update.quantity > item.quantity) {
          throw Object.assign(
            new Error(`Solo puedes reducir la cantidad de ${item.productName} (máximo ${item.quantity}).`),
            { status: 400 },
          );
        }
      }

      const newQuantityById = new Map(parsedUpdates.map((update) => [update.id, update.quantity]));
      const remainingItems = [];
      for (const item of current.items) {
        const newQuantity = newQuantityById.has(item.id) ? newQuantityById.get(item.id) : item.quantity;
        if (newQuantity === 0) {
          await tx.orderItem.delete({ where: { id: item.id } });
          continue;
        }
        if (newQuantity !== item.quantity) {
          await tx.orderItem.update({
            where: { id: item.id },
            data: { quantity: newQuantity, subtotalCents: calculateLineSubtotal(item.unitPriceCents, newQuantity) },
          });
        }
        remainingItems.push({ ...item, quantity: newQuantity });
      }

      if (remainingItems.length === 0) {
        throw Object.assign(
          new Error('El pedido debe conservar al menos una partida. Si no hay existencias, recházalo o cancélalo.'),
          { status: 400 },
        );
      }

      const totals = calculateOrderTotals(remainingItems.map((item) => ({
        originalUnitPriceCents: item.originalUnitPriceCents || item.unitPriceCents,
        discountAmountCents: item.discountAmountCents || 0,
        quantity: item.quantity,
      })));

      return tx.order.update({ where: { id: current.id }, data: totals, include: orderInclude });
    });

    await writeAuditLog({ userId: req.user.id, action: 'ADJUST_ITEMS', entity: 'Order', entityId: order.id, details: { folio: order.folio } });

    return res.json({ order: serializeOrder(order) });
  } catch (error) {
    if (Number.isInteger(error.status) && error.status < 500) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
});

export default router;
