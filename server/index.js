import './env.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import prisma from './db.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import offerRoutes from './routes/offers.js';
import orderRoutes from './routes/orders.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import customerRoutes from './routes/customers.js';
import productImportRoutes from './routes/productImport.js';
import { isSafeProductImageFilename, productUploadDirectory } from './uploads.js';
import { requireAuth } from './auth.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origen no permitido por CORS.'));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

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

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', offerRoutes);
app.use('/api', orderRoutes);
app.use('/api', reportRoutes);
app.use('/api', auditRoutes);
app.use('/api', customerRoutes);
app.use('/api', productImportRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo JSON no es válido.' });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ message: 'Ya existe un registro con ese valor único.' });
  }
  if (error.code === 'P2025') {
    return res.status(404).json({ message: 'Registro no encontrado.' });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'El archivo no puede superar 2 MB.' });
  }
  if (error.code === 'INVALID_PRODUCT_IMAGE') {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 'INVALID_PRODUCT_CSV') {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor.' });
});

const server = app.listen(port, () => {
  console.log(`Tic Toc Pharma API disponible en http://127.0.0.1:${port}`);
});

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
