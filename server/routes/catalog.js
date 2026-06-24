import { Router } from 'express';
import prisma from '../db.js';
import { HEALTH_FRACTIONS, PRODUCT_TYPES, isAllowed } from '../constants.js';
import { requireAuth, requireRole } from '../auth.js';
import { serializeCategory, serializeLaboratory, serializeProduct } from '../serializers.js';
import { getActiveOffers, getOfferApplication } from '../services/offers.js';
import { getProductImageUrl, productImageUpload } from '../uploads.js';
import { parseMoneyInput } from '../utils/money.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();

const productInclude = {
  laboratory: true,
  category: true,
};

function slugify(value) {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function getProductPayload(body, uploadedImageUrl = null) {
  const requiredFields = [
    'sku',
    'commercialName',
    'genericName',
    'activeIngredient',
    'laboratoryId',
    'categoryId',
    'pharmaceuticalForm',
    'concentration',
    'presentation',
    'productType',
  ];
  const missingField = requiredFields.find((field) => !body[field]?.toString().trim());
  const priceCents = parseMoneyInput(body.price);
  const stock = Number.parseInt(body.stock, 10);

  if (missingField) return { error: `El campo ${missingField} es obligatorio.` };
  if (priceCents === null || priceCents < 0) return { error: 'El precio no es válido.' };
  if (!Number.isInteger(stock) || stock < 0) return { error: 'El stock no es válido.' };
  if (!isAllowed(body.productType, PRODUCT_TYPES)) return { error: 'El tipo de producto no es válido.' };

  const healthFraction = body.healthFraction || 'NOT_APPLICABLE';
  if (!isAllowed(healthFraction, HEALTH_FRACTIONS)) {
    return { error: 'La fracción sanitaria no es válida.' };
  }

  return {
    data: {
      sku: body.sku.trim(),
      commercialName: body.commercialName.trim(),
      genericName: body.genericName.trim(),
      activeIngredient: body.activeIngredient.trim(),
      laboratoryId: body.laboratoryId,
      categoryId: body.categoryId,
      pharmaceuticalForm: body.pharmaceuticalForm.trim(),
      concentration: body.concentration.trim(),
      presentation: body.presentation.trim(),
      sanitaryRegistration: body.sanitaryRegistration?.trim() || null,
      healthFraction,
      requiresPrescription: toBoolean(body.requiresPrescription),
      requiresRetainedPrescription: toBoolean(body.requiresRetainedPrescription),
      isControlled: toBoolean(body.isControlled),
      productType: body.productType,
      priceCents,
      stock,
      imageUrl: uploadedImageUrl || body.imageUrl?.trim() || null,
      description: body.description?.trim() || null,
      isActive: body.isActive === undefined ? true : toBoolean(body.isActive),
    },
  };
}

async function createAuditLog(userId, action, entity, entityId, details) {
  await writeAuditLog({ userId, action, entity, entityId, details });
}

router.get('/products', requireAuth, async (req, res, next) => {
  try {
    const { q, laboratoryId, categoryId, productType, healthFraction } = req.query;
    const includeInactive = req.user.role === 'admin' && req.query.includeInactive === 'true';
    const where = includeInactive ? {} : { isActive: true };

    if (req.user.role === 'admin' && req.query.isActive !== undefined) {
      where.isActive = req.query.isActive === 'true';
    }
    if (laboratoryId) where.laboratoryId = laboratoryId;
    if (categoryId) where.categoryId = categoryId;
    if (productType && isAllowed(productType, PRODUCT_TYPES)) where.productType = productType;
    if (healthFraction && isAllowed(healthFraction, HEALTH_FRACTIONS)) {
      where.healthFraction = healthFraction;
    }
    if (q?.trim()) {
      where.OR = [
        { commercialName: { contains: q.trim() } },
        { genericName: { contains: q.trim() } },
        { activeIngredient: { contains: q.trim() } },
        { sku: { contains: q.trim() } },
      ];
    }

    const [products, activeOffers] = await Promise.all([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { commercialName: 'asc' },
      }),
      getActiveOffers(prisma),
    ]);

    res.json({
      products: products.map((product) =>
        serializeProduct(product, getOfferApplication(product, activeOffers)),
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/products/:id', requireAuth, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: productInclude,
    });

    if (!product || (!product.isActive && req.user.role !== 'admin')) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    const activeOffers = await getActiveOffers(prisma);
    return res.json({ product: serializeProduct(product, getOfferApplication(product, activeOffers)) });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/products',
  requireAuth,
  requireRole('admin'),
  productImageUpload.single('image'),
  async (req, res, next) => {
  try {
    const payload = getProductPayload(req.body, getProductImageUrl(req.file));
    if (payload.error) return res.status(400).json({ message: payload.error });

    const product = await prisma.product.create({
      data: payload.data,
      include: productInclude,
    });
    await createAuditLog(req.user.id, 'CREATE', 'Product', product.id, { sku: product.sku });
    if (req.file) {
      await createAuditLog(req.user.id, 'UPLOAD_IMAGE', 'Product', product.id, {
        sku: product.sku,
        filename: req.file.filename,
      });
    }

    return res.status(201).json({ product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
  },
);

router.put(
  '/products/:id',
  requireAuth,
  requireRole('admin'),
  productImageUpload.single('image'),
  async (req, res, next) => {
  try {
    const payload = getProductPayload(req.body, getProductImageUrl(req.file));
    if (payload.error) return res.status(400).json({ message: payload.error });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: payload.data,
      include: productInclude,
    });
    await createAuditLog(req.user.id, 'UPDATE', 'Product', product.id, { sku: product.sku });
    if (req.file) {
      await createAuditLog(req.user.id, 'UPLOAD_IMAGE', 'Product', product.id, {
        sku: product.sku,
        filename: req.file.filename,
      });
    }

    return res.json({ product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
  },
);

router.patch('/products/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive debe ser booleano.' });
    }

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive },
      include: productInclude,
    });
    await createAuditLog(req.user.id, 'STATUS_CHANGE', 'Product', product.id, {
      isActive: product.isActive,
    });

    return res.json({ product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/products/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
      include: productInclude,
    });
    await createAuditLog(req.user.id, 'SOFT_DELETE', 'Product', product.id, { sku: product.sku });

    return res.json({ product: serializeProduct(product) });
  } catch (error) {
    return next(error);
  }
});

router.get('/laboratories', requireAuth, async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' && req.query.includeInactive === 'true' ? {} : { isActive: true };
    const laboratories = await prisma.laboratory.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ laboratories: laboratories.map(serializeLaboratory) });
  } catch (error) {
    next(error);
  }
});

router.post('/laboratories', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });

    const laboratory = await prisma.laboratory.create({
      data: {
        name,
        slug: req.body.slug?.trim() || slugify(name),
        description: req.body.description?.trim() || null,
        isActive: req.body.isActive === undefined ? true : toBoolean(req.body.isActive),
      },
    });
    await createAuditLog(req.user.id, 'CREATE', 'Laboratory', laboratory.id, { name });
    return res.status(201).json({ laboratory: serializeLaboratory(laboratory) });
  } catch (error) {
    return next(error);
  }
});

router.put('/laboratories/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });

    const laboratory = await prisma.laboratory.update({
      where: { id: req.params.id },
      data: {
        name,
        slug: req.body.slug?.trim() || slugify(name),
        description: req.body.description?.trim() || null,
        isActive: req.body.isActive === undefined ? true : toBoolean(req.body.isActive),
      },
    });
    await createAuditLog(req.user.id, 'UPDATE', 'Laboratory', laboratory.id, { name });
    return res.json({ laboratory: serializeLaboratory(laboratory) });
  } catch (error) {
    return next(error);
  }
});

router.get('/categories', requireAuth, async (req, res, next) => {
  try {
    const where = req.user.role === 'admin' && req.query.includeInactive === 'true' ? {} : { isActive: true };
    const categories = await prisma.category.findMany({ where, orderBy: { name: 'asc' } });
    res.json({ categories: categories.map(serializeCategory) });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });

    const category = await prisma.category.create({
      data: {
        name,
        slug: req.body.slug?.trim() || slugify(name),
        description: req.body.description?.trim() || null,
        isActive: req.body.isActive === undefined ? true : toBoolean(req.body.isActive),
      },
    });
    await createAuditLog(req.user.id, 'CREATE', 'Category', category.id, { name });
    return res.status(201).json({ category: serializeCategory(category) });
  } catch (error) {
    return next(error);
  }
});

router.put('/categories/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        name,
        slug: req.body.slug?.trim() || slugify(name),
        description: req.body.description?.trim() || null,
        isActive: req.body.isActive === undefined ? true : toBoolean(req.body.isActive),
      },
    });
    await createAuditLog(req.user.id, 'UPDATE', 'Category', category.id, { name });
    return res.json({ category: serializeCategory(category) });
  } catch (error) {
    return next(error);
  }
});

export default router;
