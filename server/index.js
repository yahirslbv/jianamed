import './env.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import prisma from './db.js';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';

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

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api', orderRoutes);

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
