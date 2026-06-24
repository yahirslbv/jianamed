import prisma from '../db.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'sessionToken',
  'sessionTokenHash',
  'authorization',
  'cookie',
]);

function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEYS.has(key))
      .map(([key, nestedValue]) => [key, scrub(nestedValue)]),
  );
}

/** Writes an operational audit event without credentials or session secrets. */
export function writeAuditLog({ userId = null, action, entity, entityId, details = null }, client = prisma) {
  return client.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId: String(entityId),
      details: details ? JSON.stringify(scrub(details)) : null,
    },
  });
}
