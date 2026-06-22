import { randomUUID } from 'node:crypto';
import prisma from './db.js';

const SESSION_COOKIE = 'ttp_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8;
const sessions = new Map();

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    maxAge: SESSION_DURATION_MS,
    path: '/',
  };
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

export function createSession(res, userId) {
  const sessionId = randomUUID();
  sessions.set(sessionId, { userId, expiresAt: Date.now() + SESSION_DURATION_MS });
  res.cookie(SESSION_COOKIE, sessionId, getCookieOptions());
}

export function clearSession(req, res) {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) sessions.delete(sessionId);

  const { maxAge: _maxAge, ...clearOptions } = getCookieOptions();
  res.clearCookie(SESSION_COOKIE, clearOptions);
}

export async function requireAuth(req, res, next) {
  try {
    const session = getSession(req.cookies?.[SESSION_COOKIE]);

    if (!session) {
      return res.status(401).json({ message: 'Sesión requerida.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { customer: true },
    });

    if (!user || !user.isActive) {
      clearSession(req, res);
      return res.status(401).json({ message: 'Sesión no válida.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción.' });
    }

    return next();
  };
}
