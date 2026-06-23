import { Router } from 'express';
import prisma from '../db.js';
import { OFFER_DISCOUNT_TYPES, PRODUCT_TYPES, isAllowed } from '../constants.js';
import { requireAuth, requireRole } from '../auth.js';
import { serializeOffer } from '../serializers.js';
import { getActiveOffers, offerInclude } from '../services/offers.js';
import { parseMoneyInput, parsePercentageInput } from '../utils/money.js';

const router = Router();
const scopeFields = ['productId', 'laboratoryId', 'categoryId', 'productType'];

function getOptionalId(value) {
  return value?.trim() || null;
}

function getOfferPayload(body) {
  const title = body.title?.trim();
  const discountType = body.discountType;
  const discountValueCents = discountType === 'FIXED_AMOUNT' ? parseMoneyInput(body.discountValue) : null;
  const discountPercentageBps = discountType === 'PERCENTAGE' ? parsePercentageInput(body.discountValue) : null;
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  const productType = body.productType || null;
  const scopes = {
    productId: getOptionalId(body.productId),
    laboratoryId: getOptionalId(body.laboratoryId),
    categoryId: getOptionalId(body.categoryId),
    productType,
  };
  const selectedScopeCount = scopeFields.filter((field) => Boolean(scopes[field])).length;

  if (!title) return { error: 'El titulo de la oferta es obligatorio.' };
  if (!isAllowed(discountType, OFFER_DISCOUNT_TYPES)) return { error: 'El tipo de descuento no es valido.' };
  if (discountType === 'PERCENTAGE' && (discountPercentageBps === null || discountPercentageBps < 0 || discountPercentageBps > 10000)) {
    return { error: 'El descuento porcentual no puede superar 100.' };
  }
  if (discountType === 'FIXED_AMOUNT' && (discountValueCents === null || discountValueCents < 0)) {
    return { error: 'El descuento fijo debe ser un monto válido.' };
  }
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    return { error: 'La vigencia de la oferta no es valida.' };
  }
  if (selectedScopeCount !== 1) {
    return { error: 'Selecciona un solo alcance para la oferta.' };
  }
  if (productType && !isAllowed(productType, PRODUCT_TYPES)) {
    return { error: 'El tipo de producto no es valido.' };
  }

  return {
    data: {
      title,
      description: body.description?.trim() || null,
      discountType,
      discountValueCents,
      discountPercentageBps,
      startsAt,
      endsAt,
      isActive: body.isActive === undefined ? true : body.isActive === true || body.isActive === 'true',
      ...scopes,
    },
  };
}

async function createAuditLog(userId, action, offer) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entity: 'Offer',
      entityId: offer.id,
      details: JSON.stringify({ title: offer.title, isActive: offer.isActive }),
    },
  });
}

router.get('/offers', requireAuth, async (req, res, next) => {
  try {
    const includeInactive = req.user.role === 'admin' && req.query.includeInactive === 'true';
    const offers = includeInactive
      ? await prisma.offer.findMany({ include: offerInclude, orderBy: { createdAt: 'desc' } })
      : await getActiveOffers(prisma);

    return res.json({ offers: offers.map(serializeOffer) });
  } catch (error) {
    return next(error);
  }
});

router.get('/offers/active', requireAuth, async (_req, res, next) => {
  try {
    const offers = await getActiveOffers(prisma);
    return res.json({ offers: offers.map(serializeOffer) });
  } catch (error) {
    return next(error);
  }
});

router.post('/offers', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = getOfferPayload(req.body);
    if (payload.error) return res.status(400).json({ message: payload.error });

    if (payload.data.productId && payload.data.discountType === 'FIXED_AMOUNT') {
      const product = await prisma.product.findUnique({ where: { id: payload.data.productId } });
      if (!product) return res.status(400).json({ message: 'El producto seleccionado no existe.' });
      if (payload.data.discountValueCents > product.priceCents) {
        return res.status(400).json({ message: 'El descuento fijo no puede superar el precio base del producto.' });
      }
    }

    const offer = await prisma.offer.create({ data: payload.data, include: offerInclude });
    await createAuditLog(req.user.id, 'CREATE', offer);
    return res.status(201).json({ offer: serializeOffer(offer) });
  } catch (error) {
    return next(error);
  }
});

router.put('/offers/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = getOfferPayload(req.body);
    if (payload.error) return res.status(400).json({ message: payload.error });

    if (payload.data.productId && payload.data.discountType === 'FIXED_AMOUNT') {
      const product = await prisma.product.findUnique({ where: { id: payload.data.productId } });
      if (!product) return res.status(400).json({ message: 'El producto seleccionado no existe.' });
      if (payload.data.discountValueCents > product.priceCents) {
        return res.status(400).json({ message: 'El descuento fijo no puede superar el precio base del producto.' });
      }
    }

    const offer = await prisma.offer.update({
      where: { id: req.params.id },
      data: payload.data,
      include: offerInclude,
    });
    await createAuditLog(req.user.id, 'UPDATE', offer);
    return res.json({ offer: serializeOffer(offer) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/offers/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive debe ser booleano.' });
    }

    const offer = await prisma.offer.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive },
      include: offerInclude,
    });
    await createAuditLog(req.user.id, 'STATUS_CHANGE', offer);
    return res.json({ offer: serializeOffer(offer) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/offers/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const offer = await prisma.offer.update({
      where: { id: req.params.id },
      data: { isActive: false },
      include: offerInclude,
    });
    await createAuditLog(req.user.id, 'SOFT_DELETE', offer);
    return res.json({ offer: serializeOffer(offer) });
  } catch (error) {
    return next(error);
  }
});

export default router;
