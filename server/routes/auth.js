import { randomBytes, createHash } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../db.js';
import { clearSession, createSession, requireAuth } from '../auth.js';
import { normalizeRole } from '../constants.js';
import { serializeUser } from '../serializers.js';
import { writeAuditLog } from '../services/audit.js';
import { sendPasswordResetEmail } from '../services/email.js';

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
        action: 'LOGIN_FAILURE',
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

// PATCH /api/auth/change-password
// Allows any authenticated user to set a new password.
// Validates the current password, then clears forcePasswordChange.
// Revokes all other sessions so previous temporary-password sessions are invalidated.
router.patch('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'La contraseña actual y la nueva son obligatorias.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ message: 'La nueva contraseña no puede superar 72 bytes UTF-8.' });
    }

    // Load the fresh user record (req.user comes from the session without passwordHash)
    const freshUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!freshUser) return res.status(401).json({ message: 'Sesión no válida.' });

    const currentPasswordValid = await bcrypt.compare(currentPassword, freshUser.passwordHash);
    if (!currentPasswordValid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    const currentToken = req.cookies?.ttp_session;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.user.id },
        data: { passwordHash: newPasswordHash, forcePasswordChange: false },
      });
      // Revoke all sessions EXCEPT the current one so the user stays logged in
      if (currentToken) {
        const sessionSecret = process.env.SESSION_SECRET || 'development-only-session-secret';
        const currentHash = createHash('sha256').update(`${currentToken}:${sessionSecret}`).digest('hex');
        await tx.session.updateMany({
          where: { userId: req.user.id, revokedAt: null, sessionTokenHash: { not: currentHash } },
          data: { revokedAt: new Date() },
        });
      }
    });

    await writeAuditLog({
      userId: req.user.id,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: req.user.id,
      details: { forced: Boolean(freshUser.forcePasswordChange) },
    });

    // Return the updated user (forcePasswordChange is now false)
    const updatedUser = await prisma.user.findUnique({ where: { id: req.user.id }, include: { customer: true } });
    return res.json({ user: serializeUser({ ...updatedUser, role: normalizeRole(updatedUser.role) }) });
  } catch (error) {
    return next(error);
  }
});

// POST /api/auth/forgot-password
// Always responds 200 — never reveals whether the email is registered.
router.post('/forgot-password', async (req, res, next) => {
  const SAFE_RESPONSE = { message: 'Si ese correo está registrado, recibirás un enlace de restablecimiento.' };
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'El correo es obligatorio.' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return res.json(SAFE_RESPONSE);

    // Invalidate any existing unused tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } });

    const appUrl = process.env.PUBLIC_APP_URL || 'http://127.0.0.1:5173';
    const resetUrl = `${appUrl}/#/restablecer-contrasena?token=${rawToken}`;
    sendPasswordResetEmail({ name: user.name, email: user.email, resetUrl }).catch(() => {});

    await writeAuditLog({ userId: user.id, action: 'PASSWORD_RESET_REQUEST', entity: 'User', entityId: user.id });
    return res.json(SAFE_RESPONSE);
  } catch (error) {
    return next(error);
  }
});

// POST /api/auth/reset-password
// Validates the one-time token and sets a new password.
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'El token y la nueva contraseña son obligatorios.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ message: 'La nueva contraseña no puede superar 72 bytes UTF-8.' });
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'El enlace no es válido o ya expiró. Solicita uno nuevo.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash, forcePasswordChange: false },
      });
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      // Revoke all active sessions — user must log in with the new password
      await tx.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    await writeAuditLog({ userId: record.userId, action: 'PASSWORD_RESET', entity: 'User', entityId: record.userId });
    return res.json({ message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
