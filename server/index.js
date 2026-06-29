import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import prisma from './db.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import offerRoutes from './routes/offers.js';
import orderRoutes from './routes/orders.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import customerRoutes from './routes/customers.js';
import userRoutes from './routes/users.js';
import productImportRoutes from './routes/productImport.js';
import { checkProductUploadDirectory, isSafeProductImageFilename, productUploadDirectory } from './uploads.js';
import { purgeExpiredSessions, requireAuth } from './auth.js';
import { purgeExpiredPreviews } from './services/productImport.js';
import { purgeExpiredPendingCheckouts } from './services/payments.js';
import { config, staticFrontendDirectory, validateRuntimeEnvironment } from './env.js';
import paymentRoutes from './routes/payments.js';
import { requestLogger, logger } from './services/logger.js';

const app = express();
const port = Number(process.env.PORT || 4000);
validateRuntimeEnvironment();
const allowedOrigins = config.frontendOrigins;
if (config.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Demasiados intentos. Intenta de nuevo mas tarde.' },
});

// Global API rate limit — generous ceiling to stop runaway clients,
// not a throttle on normal use. Webhooks and static assets are exempt.
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/payments/webhook'), // exempt Stripe webhooks
  message: { message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
});

function requestOrigin(req) {
  const origin = req.get('origin');
  if (origin) return origin;
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function enforceTrustedOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = requestOrigin(req);
  // Browser-based production calls must include one of the explicit frontend origins.
  // A Referer fallback covers browsers that omit Origin on same-site form requests.
  // Local scripts remain convenient in development, while CORS still protects browsers.
  if (!origin && !config.isProduction) return next();
  if (origin && allowedOrigins.includes(origin)) return next();
  return res.status(403).json({ message: 'Origen de solicitud no permitido.' });
}

app.use((req, res, next) => {
  req.requestId = req.get('x-request-id')?.slice(0, 100) || randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
});
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // HSTS is meaningful only for the public HTTPS deployment, never for local HTTP.
  strictTransportSecurity: config.cookieSecure ? undefined : false,
}));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error('Origen no permitido por CORS.');
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  }),
);
// Stripe webhooks require the raw (unparsed) body for signature verification.
// This middleware MUST come before express.json() so it captures the stream first.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(enforceTrustedOrigin);
app.use('/api', globalApiLimiter);
app.use(requestLogger);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tic-toc-pharma-api' });
});

app.get('/api/ready', async (_req, res) => {
  const [database, uploads] = await Promise.allSettled([
    prisma.user.count(),
    checkProductUploadDirectory(),
  ]);
  const databaseOk = database.status === 'fulfilled';
  const uploadsOk = uploads.status === 'fulfilled' && uploads.value.ok;
  const failedChecks = Number(!databaseOk) + Number(!uploadsOk);
  const status = failedChecks === 0 ? 'ok' : failedChecks === 2 ? 'error' : 'degraded';
  const response = {
    status,
    service: 'tic-toc-pharma-api',
    database: databaseOk ? 'ok' : 'error',
    uploads: uploadsOk ? 'ok' : 'error',
  };
  return res.status(failedChecks ? 503 : 200).json(response);
});

app.get('/api/uploads/products/:filename', requireAuth, (req, res) => {
  const { filename } = req.params;
  if (!isSafeProductImageFilename(filename)) {
    return res.status(404).json({ message: 'Imagen no encontrada.' });
  }

  return res.sendFile(filename, { root: productUploadDirectory }, (error) => {
    if (error && !res.headersSent) res.status(404).json({ message: 'Imagen no encontrada.' });
  });
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', offerRoutes);
app.use('/api', orderRoutes);
app.use('/api', reportRoutes);
app.use('/api', auditRoutes);
app.use('/api', customerRoutes);
app.use('/api', userRoutes);
app.use('/api', productImportRoutes);
app.use('/api', paymentRoutes);

if (config.serveStaticFrontend) {
  app.use(express.static(staticFrontendDirectory, { index: false, maxAge: '1h' }));
  // The SPA fallback intentionally runs after API routes. /api paths keep their JSON 404.
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => res.sendFile('index.html', { root: staticFrontendDirectory }));
}

app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.use((error, req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo JSON no es valido.' });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ message: 'Ya existe un registro con ese valor unico.' });
  }
  if (error.code === 'P2025') {
    return res.status(404).json({ message: 'Registro no encontrado.' });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: `El archivo no puede superar ${config.maxUploadMb} MB.` });
  }
  if (error.code === 'INVALID_PRODUCT_IMAGE' || error.code === 'INVALID_PRODUCT_CSV') {
    return res.status(400).json({ message: error.message });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  // Never log request bodies, credentials, cookies, session tokens, or uploaded content.
  logger.error('API request failed', { requestId: req.requestId, name: error.name, code: error.code, status });
  return res.status(status).json({ message: status >= 500 ? 'Error interno del servidor.' : error.message });
});

const server = app.listen(port, () => {
  logger.info(`Tic Toc Pharma API disponible en http://127.0.0.1:${port}`);
});

// Best-effort hygiene: persistent sessions survive restarts, but expired/revoked rows do not.
function runPersistenceCleanup() {
  const purgeExpiredPasswordResetTokens = () =>
    prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // 24 h grace
    });

  Promise.all([
    purgeExpiredSessions(),
    purgeExpiredPreviews(prisma),
    purgeExpiredPendingCheckouts(prisma),
    purgeExpiredPasswordResetTokens(),
  ]).catch((error) => logger.error('No se pudo completar la limpieza de persistencia.', { name: error.name, code: error.code }));
}

runPersistenceCleanup();
const sessionCleanupTimer = setInterval(() => {
  runPersistenceCleanup();
}, 60 * 60 * 1000);
sessionCleanupTimer.unref();

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
