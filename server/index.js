import './env.js';
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
import { isSafeProductImageFilename, productUploadDirectory } from './uploads.js';
import { purgeExpiredSessions, requireAuth } from './auth.js';
import { purgeExpiredPreviews } from './services/productImport.js';
import { config, validateRuntimeEnvironment } from './env.js';

const app = express();
const port = Number(process.env.PORT || 4000);
validateRuntimeEnvironment();
const allowedOrigins = config.frontendOrigins;
if (config.trustProxy) app.set('trust proxy', 1);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Demasiados intentos. Intenta de nuevo mas tarde.' },
});

function enforceTrustedOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('origin');
  // Browser-based production calls must include one of the explicit frontend origins.
  // Local scripts remain convenient in development, while CORS still protects browsers.
  if (!origin && !config.isProduction) return next();
  if (origin && allowedOrigins.includes(origin)) return next();
  return res.status(403).json({ message: 'Origen de solicitud no permitido.' });
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
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
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(enforceTrustedOrigin);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tic-toc-pharma-api' });
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

app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
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
    return res.status(400).json({ message: 'El archivo no puede superar 2 MB.' });
  }
  if (error.code === 'INVALID_PRODUCT_IMAGE' || error.code === 'INVALID_PRODUCT_CSV') {
    return res.status(400).json({ message: error.message });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  // Never log request bodies, credentials, cookies, session tokens, or uploaded content.
  console.error('API request failed', { name: error.name, code: error.code, status });
  return res.status(status).json({ message: status >= 500 ? 'Error interno del servidor.' : error.message });
});

const server = app.listen(port, () => {
  console.log(`Tic Toc Pharma API disponible en http://127.0.0.1:${port}`);
});

// Best-effort hygiene: persistent sessions survive restarts, but expired/revoked rows do not.
function runPersistenceCleanup() {
  Promise.all([purgeExpiredSessions(), purgeExpiredPreviews(prisma)])
    .catch((error) => console.error('No se pudo completar la limpieza de persistencia.', { name: error.name, code: error.code }));
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
