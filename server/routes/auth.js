import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db.js';
import { clearSession, createSession, requireAuth } from '../auth.js';
import { normalizeRole } from '../constants.js';
import { serializeUser } from '../serializers.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });

    const user = await prisma.user.findUnique({ where: { email }, include: { customer: true } });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      await writeAuditLog({
        userId: user?.id || null,
        action: 'LOGIN_FAILED',
        entity: 'User',
        entityId: user?.id || 'unknown',
        details: { reason: user ? (user.isActive ? 'INVALID_CREDENTIALS' : 'INACTIVE_USER') : 'UNKNOWN_USER' },
      });
      return res.status(401).json({ message: 'Credenciales no válidas.' });
    }

    await createSession(req, res, user.id);
    await writeAuditLog({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id });
    return res.json({ user: serializeUser({ ...user, role: normalizeRole(user.role) }) });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await writeAuditLog({ userId: req.user.id, action: 'LOGOUT', entity: 'User', entityId: req.user.id });
    await clearSession(req, res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: serializeUser(req.user) }));

export default router;
