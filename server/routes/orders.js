import { Router } from 'express';
import prisma from '../db.js';
import { ORDER_STATUSES, isAllowed } from '../constants.js';
import { requireAuth, requireRole } from '../auth.js';
import { serializeOrder } from '../serializers.js';

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

async function createOrder(req, res, next) {
  try {
    if (!req.user.customer || !req.user.customer.isAuthorized) {
      return res.status(403).json({ message: 'El cliente no está autorizado para solicitar pedidos.' });
    }

    const normalized = normalizeItems(req.body.items);
    if (normalized.error) return res.status(400).json({ message: normalized.error });

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

      const subtotal = normalized.items.reduce((total, item) => {
        const product = productsById.get(item.productId);
        return total + product.price * item.quantity;
      }, 0);
      const year = new Date().getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const startOfNextYear = new Date(year + 1, 0, 1);
      const sequence =
        (await tx.order.count({
          where: { createdAt: { gte: startOfYear, lt: startOfNextYear } },
        })) + 1;

      for (const item of normalized.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return tx.order.create({
        data: {
          folio: buildOrderFolio(year, sequence),
          userId: req.user.id,
          customerId: req.user.customer.id,
          status: 'PENDING_REVIEW',
          subtotal,
          total: subtotal,
          observations,
          items: {
            create: normalized.items.map((item) => {
              const product = productsById.get(item.productId);
              return {
                productId: product.id,
                sku: product.sku,
                productName: product.commercialName,
                laboratoryName: product.laboratory.name,
                presentation: product.presentation,
                quantity: item.quantity,
                unitPrice: product.price,
                subtotal: product.price * item.quantity,
              };
            }),
          },
        },
        include: orderInclude,
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'Order',
        entityId: order.id,
        details: JSON.stringify({ folio: order.folio }),
      },
    });

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

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CANCEL',
        entity: 'Order',
        entityId: result.order.id,
        details: JSON.stringify({ folio: result.order.folio }),
      },
    });

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
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'STATUS_CHANGE',
        entity: 'Order',
        entityId: order.id,
        details: JSON.stringify({ status }),
      },
    });

    return res.json({ order: serializeOrder(order) });
  } catch (error) {
    return next(error);
  }
});

export default router;
