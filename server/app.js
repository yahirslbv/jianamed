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
import { requireAuth } from './auth.js';
import { config, staticFrontendDirectory } from './env.js';
import paymentRoutes from './routes/payments.js';
import salesPeriodRoutes from './routes/salesPeriods.js';
import { requestLogger, logger } from './services/logger.js';

export function createApp() {
  const app = express();
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

  const globalApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/api/payments/webhook'),
    message: { message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
  });

  function requestOrigin(req) {
    const origin = req.get('origin');
    if (origin) return origin;
    const referer = req.get('referer');
    if (!referer) return null;
    try { return new URL(referer).origin; } catch { return null; }
  }

  function enforceTrustedOrigin(req, res, next) {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
    const origin = requestOrigin(req);
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
    strictTransportSecurity: config.cookieSecure ? undefined : false,
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error('Origen no permitido por CORS.');
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  }));
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
    return res.status(failedChecks ? 503 : 200).json({
      status, service: 'tic-toc-pharma-api',
      database: databaseOk ? 'ok' : 'error',
      uploads: uploadsOk ? 'ok' : 'error',
    });
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
  app.use('/api', salesPeriodRoutes);

  if (config.serveStaticFrontend) {
    app.use(express.static(staticFrontendDirectory, { index: false, maxAge: '1h' }));
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
    logger.error('API request failed', { requestId: req.requestId, name: error.name, code: error.code, status });
    return res.status(status).json({ message: status >= 500 ? 'Error interno del servidor.' : error.message });
  });

  return app;
}
