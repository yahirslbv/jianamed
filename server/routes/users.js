import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { INTERNAL_ROLES, normalizeInternalRole } from '../constants.js';
import { canManageUsers } from '../permissions.js';
import { serializeInternalUser } from '../serializers.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();
const BCRYPT_ROUNDS = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

function text(value) {
  return String(value || '').trim();
}

function readEmail(value) {
  const email = text(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function validatePassword(value, { required = true } = {}) {
  const password = String(value || '');
  if (!password && !required) return { password: null };
  if (password.length < 8) return { error: 'La contrase\u00f1a debe tener al menos 8 caracteres.' };
  if (Buffer.byteLength(password, 'utf8') > MAX_BCRYPT_PASSWORD_BYTES) {
    return { error: 'La contrase\u00f1a no puede superar 72 bytes UTF-8.' };
  }
  return { password };
}

function validateUserPayload(body, { requireStatus = false } = {}) {
  const name = text(body.name);
  const email = readEmail(body.email);
  const role = normalizeInternalRole(body.role);

  if (!name) return { error: 'El nombre es obligatorio.' };
  if (!email) return { error: 'Ingresa un correo v\u00e1lido.' };
  if (!role) return { error: 'El rol debe ser ADMIN, SALES o SUPERVISOR.' };
  if (name.length > 120) return { error: 'El nombre no puede superar 120 caracteres.' };
  if (requireStatus && typeof body.isActive !== 'boolean') return { error: 'isActive debe ser booleano.' };

  return { data: { name, email, role, ...(requireStatus ? { isActive: body.isActive } : {}) } };
}

async function findInternalUser(client, id) {
  return client.user.findFirst({ where: { id, role: { in: INTERNAL_ROLES } } });
}

async function assertAdminInvariant(client, currentUser, nextData, actorId) {
  const removesActiveAdmin = currentUser.role === 'ADMIN'
    && currentUser.isActive
    && (nextData.role !== 'ADMIN' || nextData.isActive === false);

  if (!removesActiveAdmin) return;
  if (currentUser.id === actorId && nextData.isActive === false) {
    const error = new Error('No puedes desactivar tu propia cuenta administrativa.');
    error.status = 400;
    throw error;
  }

  const activeAdminCount = await client.user.count({ where: { role: 'ADMIN', isActive: true } });
  if (activeAdminCount <= 1) {
    const error = new Error('Debe mantenerse al menos un administrador activo.');
    error.status = 400;
    throw error;
  }
}

function requireUserManagement(req, res, next) {
  if (!canManageUsers(req.user)) return res.status(403).json({ message: 'No tienes permisos para administrar usuarios.' });
  return next();
}

router.get('/admin/users', requireAuth, requireRole('admin'), requireUserManagement, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: INTERNAL_ROLES } },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return res.json({ users: users.map(serializeInternalUser) });
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/users/:id', requireAuth, requireRole('admin'), requireUserManagement, async (req, res, next) => {
  try {
    const user = await findInternalUser(prisma, req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario interno no encontrado.' });
    return res.json({ user: serializeInternalUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/users', requireAuth, requireRole('admin'), requireUserManagement, async (req, res, next) => {
  try {
    const payload = validateUserPayload(req.body);
    if (payload.error) return res.status(400).json({ message: payload.error });
    const passwordResult = validatePassword(req.body.password);
    if (passwordResult.error) return res.status(400).json({ message: passwordResult.error });
    const passwordHash = await bcrypt.hash(passwordResult.password, BCRYPT_ROUNDS);
    const isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : true;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { ...payload.data, isActive, passwordHash } });
      await writeAuditLog({
        userId: req.user.id,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: created.id,
        details: { email: created.email, role: created.role, isActive: created.isActive },
      }, tx);
      return created;
    });

    return res.status(201).json({ user: serializeInternalUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.put('/admin/users/:id', requireAuth, requireRole('admin'), requireUserManagement, async (req, res, next) => {
  try {
    const payload = validateUserPayload(req.body, { requireStatus: true });
    if (payload.error) return res.status(400).json({ message: payload.error });

    const user = await prisma.$transaction(async (tx) => {
      const current = await findInternalUser(tx, req.params.id);
      if (!current) {
        const error = new Error('Usuario interno no encontrado.');
        error.status = 404;
        throw error;
      }
      await assertAdminInvariant(tx, current, payload.data, req.user.id);
      const updated = await tx.user.update({ where: { id: current.id }, data: payload.data });
      await writeAuditLog({
        userId: req.user.id,
        action: 'UPDATE_USER',
        entity: 'User',
        entityId: updated.id,
        details: { email: updated.email, role: updated.role, isActive: updated.isActive },
      }, tx);
      return updated;
    });

    return res.json({ user: serializeInternalUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/admin/users/:id/status', requireAuth, requireRole('admin'), requireUserManagement, async (req, res, next) => {
  try {
    if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'isActive debe ser booleano.' });

    const user = await prisma.$transaction(async (tx) => {
      const current = await findInternalUser(tx, req.params.id);
      if (!current) {
        const error = new Error('Usuario interno no encontrado.');
        error.status = 404;
        throw error;
      }
      await assertAdminInvariant(tx, current, { role: current.role, isActive: req.body.isActive }, req.user.id);
      const updated = await tx.user.update({ where: { id: current.id }, data: { isActive: req.body.isActive } });
      await writeAuditLog({
        userId: req.user.id,
        action: 'STATUS_CHANGE_USER',
        entity: 'User',
        entityId: updated.id,
        details: { isActive: updated.isActive },
      }, tx);
      return updated;
    });

    return res.json({ user: serializeInternalUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/admin/users/:id/role', requireAuth, requireRole('admin'), requireUserManagement, async (req, res, next) => {
  try {
    const role = normalizeInternalRole(req.body.role);
    if (!role) return res.status(400).json({ message: 'El rol debe ser ADMIN, SALES o SUPERVISOR.' });

    const user = await prisma.$transaction(async (tx) => {
      const current = await findInternalUser(tx, req.params.id);
      if (!current) {
        const error = new Error('Usuario interno no encontrado.');
        error.status = 404;
        throw error;
      }
      await assertAdminInvariant(tx, current, { role, isActive: current.isActive }, req.user.id);
      const updated = await tx.user.update({ where: { id: current.id }, data: { role } });
      await writeAuditLog({
        userId: req.user.id,
        action: 'ROLE_CHANGE_USER',
        entity: 'User',
        entityId: updated.id,
        details: { role: updated.role },
      }, tx);
      return updated;
    });

    return res.json({ user: serializeInternalUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/admin/users/:id/password', requireAuth, requireRole('admin'), requireUserManagement, async (req, res, next) => {
  try {
    const passwordResult = validatePassword(req.body.password);
    if (passwordResult.error) return res.status(400).json({ message: passwordResult.error });
    const passwordHash = await bcrypt.hash(passwordResult.password, BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const current = await findInternalUser(tx, req.params.id);
      if (!current) {
        const error = new Error('Usuario interno no encontrado.');
        error.status = 404;
        throw error;
      }
      const updated = await tx.user.update({ where: { id: current.id }, data: { passwordHash } });
      await tx.session.updateMany({
        where: { userId: current.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await writeAuditLog({
        userId: req.user.id,
        action: 'PASSWORD_RESET_USER',
        entity: 'User',
        entityId: updated.id,
        details: { sessionsRevoked: true },
      }, tx);
      return updated;
    });

    return res.json({ user: serializeInternalUser(user) });
  } catch (error) {
    return next(error);
  }
});

export default router;
