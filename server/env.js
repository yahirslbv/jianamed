import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const currentFile = fileURLToPath(import.meta.url);
dotenv.config({ path: path.join(path.dirname(currentFile), '.env') });

function fail(message) {
  throw new Error(`Configuracion de entorno invalida: ${message}`);
}

function parseOrigins(value) {
  const origins = String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length) fail('FRONTEND_ORIGINS debe contener al menos un origen.');
  if (origins.some((origin) => origin === '*' || origin.includes('*'))) {
    fail('FRONTEND_ORIGINS no admite comodines.');
  }
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
        fail(`FRONTEND_ORIGINS contiene un origen invalido: ${origin}`);
      }
    } catch {
      fail(`FRONTEND_ORIGINS contiene un origen invalido: ${origin}`);
    }
  }
  return origins;
}

function readBoolean(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`${name} debe ser true o false.`);
}

function readPositiveInteger(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) fail(`${name} debe ser un entero entre 1 y 1000.`);
  return parsed;
}

const nodeEnv = process.env.NODE_ENV || 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  fail('NODE_ENV debe ser development, test o production.');
}

const databaseUrl = String(process.env.DATABASE_URL || '');
if (!databaseUrl) fail('DATABASE_URL es obligatorio.');

const cookieSecure = readBoolean('COOKIE_SECURE', false);
const cookieSameSite = String(process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!['lax', 'strict', 'none'].includes(cookieSameSite)) {
  fail('COOKIE_SAME_SITE debe ser lax, strict o none.');
}
if (cookieSameSite === 'none' && !cookieSecure) {
  fail('COOKIE_SECURE debe ser true cuando COOKIE_SAME_SITE=none.');
}

const frontendOrigins = parseOrigins(process.env.FRONTEND_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173');
const trustProxy = readBoolean('TRUST_PROXY', false);

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  databaseUrl,
  frontendOrigins,
  cookieSecure,
  cookieSameSite,
  trustProxy,
  loginRateLimitMax: readPositiveInteger('LOGIN_RATE_LIMIT_MAX', 10),
};

/** Call only from the HTTP server, not Prisma tooling or data-only scripts. */
export function validateRuntimeEnvironment() {
  const sessionSecret = String(process.env.SESSION_SECRET || '');
  if (!config.isProduction) return;
  if (!sessionSecret) fail('SESSION_SECRET es obligatorio para iniciar la API en produccion.');
  if (!/^postgres(?:ql)?:\/\//i.test(config.databaseUrl)) {
    fail('DATABASE_URL debe apuntar a PostgreSQL en produccion, nunca a SQLite.');
  }
  if (!config.cookieSecure) fail('COOKIE_SECURE debe ser true en produccion.');
  if (sessionSecret.length < 32 || /replace-with|change-me|secret$/i.test(sessionSecret)) {
    fail('SESSION_SECRET debe ser largo, aleatorio y no usar un valor de ejemplo en produccion.');
  }
  if (config.frontendOrigins.some((origin) => !origin.startsWith('https://'))) {
    fail('FRONTEND_ORIGINS debe usar solo HTTPS en produccion.');
  }
}
