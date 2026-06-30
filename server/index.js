import { createApp } from './app.js';
import { validateRuntimeEnvironment } from './env.js';
import { logger } from './services/logger.js';
import prisma from './db.js';
import { purgeExpiredSessions } from './auth.js';
import { purgeExpiredPreviews } from './services/productImport.js';
import { purgeExpiredPendingCheckouts } from './services/payments.js';

validateRuntimeEnvironment();

const app = createApp();
const port = Number(process.env.PORT || 4000);

const server = app.listen(port, () => {
  logger.info(`Tic Toc Pharma API disponible en http://127.0.0.1:${port}`);
});

function runPersistenceCleanup() {
  const purgeExpiredPasswordResetTokens = () =>
    prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
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
