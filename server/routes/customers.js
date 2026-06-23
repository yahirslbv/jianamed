import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { serializeCustomer } from '../serializers.js';
import { parseMoneyInput } from '../utils/money.js';

const router = Router();
const customerInclude = { user: { select: { id: true, name: true, email: true, isActive: true } } };

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function text(value) {
  return value?.toString().trim() || '';
}

function customerPayload(body) {
  const required = ['name', 'email', 'businessName', 'contactName', 'phone', 'address', 'city', 'state', 'postalCode'];
  const missing = required.find((field) => !text(body[field]));
  if (missing) return { error: `El campo ${missing} es obligatorio.` };
  return {
    data: {
      user: { name: text(body.name), email: text(body.email).toLowerCase(), isActive: toBoolean(body.isActive, true) },
      customer: {
        businessName: text(body.businessName), commercialName: text(body.commercialName) || null,
        rfc: text(body.rfc) || null, contactName: text(body.contactName), phone: text(body.phone),
        address: text(body.address), city: text(body.city), state: text(body.state), postalCode: text(body.postalCode),
        sanitaryLicense: text(body.sanitaryLicense) || null, isAuthorized: toBoolean(body.isAuthorized, false),
      },
    },
  };
}

async function audit(userId, action, customer, details = {}) {
  await prisma.auditLog.create({
    data: { userId, action, entity: 'Customer', entityId: customer.id, details: JSON.stringify(details) },
  });
}

router.get('/admin/customers', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({ include: customerInclude, orderBy: { createdAt: 'desc' } });
    return res.json({ customers: customers.map(serializeCustomer) });
  } catch (error) { return next(error); }
});

router.get('/admin/customers/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id }, include: customerInclude });
    if (!customer) return res.status(404).json({ message: 'Cliente no encontrado.' });
    return res.json({ customer: serializeCustomer(customer) });
  } catch (error) { return next(error); }
});

router.post('/admin/customers', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = customerPayload(req.body);
    if (payload.error) return res.status(400).json({ message: payload.error });
    const password = String(req.body.password || '');
    if (password.length < 8) return res.status(400).json({ message: 'La contraseña inicial debe tener al menos 8 caracteres.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const customer = await prisma.customer.create({
      data: { ...payload.data.customer, user: { create: { ...payload.data.user, passwordHash, role: 'client' } } },
      include: customerInclude,
    });
    await audit(req.user.id, 'CREATE', customer, { email: customer.user.email, isAuthorized: customer.isAuthorized });
    return res.status(201).json({ customer: serializeCustomer(customer) });
  } catch (error) { return next(error); }
});

router.put('/admin/customers/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const payload = customerPayload(req.body);
    if (payload.error) return res.status(400).json({ message: payload.error });
    const password = String(req.body.password || '');
    if (password && password.length < 8) return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
    const userData = { ...payload.data.user };
    if (password) userData.passwordHash = await bcrypt.hash(password, 12);
    const customer = await prisma.customer.update({
      where: { id: req.params.id }, data: { ...payload.data.customer, user: { update: userData } }, include: customerInclude,
    });
    await audit(req.user.id, 'UPDATE', customer, { email: customer.user.email });
    return res.json({ customer: serializeCustomer(customer) });
  } catch (error) { return next(error); }
});

router.patch('/admin/customers/:id/status', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'isActive debe ser booleano.' });
    const customer = await prisma.customer.update({
      where: { id: req.params.id }, data: { user: { update: { isActive: req.body.isActive } } }, include: customerInclude,
    });
    await audit(req.user.id, 'STATUS_CHANGE', customer, { isActive: customer.user.isActive });
    return res.json({ customer: serializeCustomer(customer) });
  } catch (error) { return next(error); }
});

router.patch('/admin/customers/:id/authorization', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    if (typeof req.body.isAuthorized !== 'boolean') return res.status(400).json({ message: 'isAuthorized debe ser booleano.' });
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data: { isAuthorized: req.body.isAuthorized }, include: customerInclude });
    await audit(req.user.id, 'AUTHORIZATION_CHANGE', customer, { isAuthorized: customer.isAuthorized });
    return res.json({ customer: serializeCustomer(customer) });
  } catch (error) { return next(error); }
});

router.patch('/admin/customers/:id/credit', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const creditLimitCents = parseMoneyInput(req.body.creditLimit);
    const creditUsedCents = parseMoneyInput(req.body.creditUsed);
    if (creditLimitCents === null || creditUsedCents === null || creditLimitCents < 0 || creditUsedCents < 0 || creditUsedCents > creditLimitCents) {
      return res.status(400).json({ message: 'Los montos de crédito deben ser válidos y el usado no puede superar el límite.' });
    }
    const creditEnabled = toBoolean(req.body.creditEnabled, false);
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { creditEnabled, creditLimitCents, creditUsedCents, creditStatus: creditEnabled ? 'ACTIVE' : 'DISABLED' },
      include: customerInclude,
    });
    await audit(req.user.id, 'CREDIT_CONFIGURATION', customer, { creditEnabled, creditLimitCents, creditUsedCents });
    return res.json({ customer: serializeCustomer(customer) });
  } catch (error) { return next(error); }
});

export default router;
