import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const currentFile = fileURLToPath(import.meta.url);
const serverDirectory = path.dirname(currentFile);
export const projectRoot = path.resolve(serverDirectory, '..');
export const defaultProductUploadDirectory = path.join(serverDirectory, 'uploads', 'products');
export const staticFrontendDirectory = path.join(projectRoot, 'dist');

// Local development historically uses server/.env. Deployment providers inject
// variables directly; scripts that use .env.preproduction load it before this module.
dotenv.config({ path: path.join(serverDirectory, '.env') });

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

function readPositiveInteger(name, fallback, maximum = 1000) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    fail(`${name} debe ser un entero entre 1 y ${maximum}.`);
  }
  return parsed;
}

function isPostgresUrl(value) {
  return /^postgres(?:ql)?:\/\//i.test(value);
}

const nodeEnv = process.env.NODE_ENV || 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  fail('NODE_ENV debe ser development, test o production.');
}

const databaseUrl = String(process.env.DATABASE_URL || '');
if (!databaseUrl) fail('DATABASE_URL es obligatorio.');

const cookieSecure = readBoolean('COOKIE_SECURE', false);
const cookieSameSite = String(process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!['lax', 'strict'].includes(cookieSameSite)) {
  fail('COOKIE_SAME_SITE debe ser lax o strict.');
}

const stagingLocal = readBoolean('STAGING_LOCAL', false);
const stagingEnvironment = readBoolean('STAGING_ENVIRONMENT', false);
const preproductionEnvironment = readBoolean('PREPRODUCTION_ENVIRONMENT', false);
const serveStaticFrontend = readBoolean('SERVE_STATIC_FRONTEND', false);
const frontendOrigins = parseOrigins(process.env.FRONTEND_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173');
const trustProxy = readBoolean('TRUST_PROXY', false);
const uploadDirValue = String(process.env.UPLOAD_DIR || defaultProductUploadDirectory).trim();
if (!uploadDirValue) fail('UPLOAD_DIR no puede estar vacio.');

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  databaseUrl,
  frontendOrigins,
  cookieSecure,
  cookieSameSite,
  trustProxy,
  stagingLocal,
  stagingEnvironment,
  preproductionEnvironment,
  serveStaticFrontend,
  uploadDir: path.resolve(uploadDirValue),
  maxUploadMb: readPositiveInteger('MAX_UPLOAD_MB', 2, 25),
  loginRateLimitMax: readPositiveInteger('LOGIN_RATE_LIMIT_MAX', 10),
};

/** Call only from the HTTP server or a deployment validation script. */
export function validateRuntimeEnvironment() {
  const sessionSecret = String(process.env.SESSION_SECRET || '');
  // Validate Stripe keys in any environment where they are set
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (stripeKey && !stripeKey.startsWith('sk_')) {
    fail('STRIPE_SECRET_KEY no tiene el formato esperado (debe comenzar con sk_).');
  }
  if (config.isProduction) {
    if (!stripeKey) fail('STRIPE_SECRET_KEY es obligatorio en produccion.');
    if (!stripeKey.startsWith('sk_live_')) fail('STRIPE_SECRET_KEY debe ser la clave LIVE en produccion (sk_live_...).');
    if (!webhookSecret) fail('STRIPE_WEBHOOK_SECRET es obligatorio en produccion.');
    if (!process.env.PUBLIC_APP_URL) fail('PUBLIC_APP_URL es obligatorio en produccion para generar URLs de pago correctas.');
  }
  // Validate email configuration
  const resendKey = process.env.RESEND_API_KEY;
  if (config.isProduction && !resendKey) {
    fail('RESEND_API_KEY es obligatorio en produccion para enviar emails transaccionales.');
  }
  if (resendKey && !resendKey.startsWith('re_')) {
    fail('RESEND_API_KEY no tiene el formato esperado (debe comenzar con re_).');
  }

  if (!config.isProduction) return;

  if (!sessionSecret) fail('SESSION_SECRET es obligatorio para iniciar la API en produccion.');
  if (sessionSecret.length < 32 || /replace-with|change-(?:me|this)|secret$/i.test(sessionSecret)) {
    fail('SESSION_SECRET debe ser largo, aleatorio y no usar un valor de ejemplo en produccion.');
  }
  if (!isPostgresUrl(config.databaseUrl) || /^file:/i.test(config.databaseUrl)) {
    fail('DATABASE_URL debe apuntar a PostgreSQL en produccion, nunca a SQLite.');
  }
  if (process.env.FRONTEND_ORIGINS === undefined || !process.env.FRONTEND_ORIGINS.trim()) {
    fail('FRONTEND_ORIGINS es obligatorio en produccion.');
  }
  if (process.env.TRUST_PROXY === undefined || process.env.TRUST_PROXY === '') {
    fail('TRUST_PROXY debe declararse explicitamente en produccion.');
  }
  if (!config.cookieSecure && !config.stagingLocal) {
    fail('COOKIE_SECURE debe ser true en produccion, excepto staging local marcado con STAGING_LOCAL=true.');
  }
  if (!config.stagingLocal && config.frontendOrigins.some((origin) => !origin.startsWith('https://'))) {
    fail('FRONTEND_ORIGINS debe usar solo HTTPS en produccion publico.');
  }
  if (!process.env.UPLOAD_DIR?.trim() && !config.stagingLocal) {
    fail('UPLOAD_DIR debe definirse en produccion para asegurar almacenamiento persistente.');
  }
  if (config.stagingEnvironment && !config.stagingLocal && !config.preproductionEnvironment) {
    fail('STAGING_ENVIRONMENT=true solo se permite en staging local o preproduccion controlada (PREPRODUCTION_ENVIRONMENT=true).');
  }
  if (config.serveStaticFrontend && !existsSync(staticFrontendDirectory)) {
    fail(`SERVE_STATIC_FRONTEND=true pero no existe el build de Vite en ${staticFrontendDirectory}. Ejecuta npm run build antes de iniciar.`);
  }
}

export function isPostgresDatabaseUrl(value = config.databaseUrl) {
  return isPostgresUrl(String(value || ''));
}
