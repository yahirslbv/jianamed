import { createHash, randomBytes } from 'node:crypto';
import prisma from './db.js';
import { normalizeRole } from './constants.js';
import { config } from './env.js';

const SESSION_COOKIE = 'ttp_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: SESSION_DURATION_MS,
    path: '/',
  };
}

function hashSessionToken(token) {
  // Production startup rejects an absent secret. This fallback keeps legacy local
  // development usable without weakening a production session configuration.
  const sessionSecret = process.env.SESSION_SECRET || 'development-only-session-secret';
  return createHash('sha256')
    .update(`${token}:${sessionSecret}`)
    .digest('hex');
}

function getRequestMetadata(req) {
  return {
    userAgent: req.get('user-agent')?.slice(0, 500) || null,
    ipAddress: req.ip?.slice(0, 100) || null,
  };
}

export async function createSession(req, res, userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: {
      userId,
      sessionTokenHash: hashSessionToken(token),
      expiresAt,
      ...getRequestMetadata(req),
    },
  });
  res.cookie(SESSION_COOKIE, token, getCookieOptions());
}

export async function clearSession(req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    await prisma.session.updateMany({
      where: { sessionTokenHash: hashSessionToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  const { maxAge: _maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie(SESSION_COOKIE, clearOptions);
}

export function purgeExpiredSessions(client = prisma) {
  return client.session.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] },
  });
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return res.status(401).json({ message: 'Sesion requerida.' });

    const session = await prisma.session.findFirst({
      where: {
        sessionTokenHash: hashSessionToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: { customer: true } } },
    });
    const user = session?.user;
    if (!user || !user.isActive) {
      await clearSession(req, res);
      return res.status(401).json({ message: 'Sesion no valida.' });
    }

    // PostgreSQL stores enum values in uppercase; the existing API/UI contract stays lowercase.
    req.user = { ...user, role: normalizeRole(user.role) };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta accion.' });
    }
    return next();
  };
}
