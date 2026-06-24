import { loadPreproductionEnvironment } from './deployment-env.js';

const requiredTables = ['User', 'Session', 'Product', 'Order', 'AuditLog', '_prisma_migrations'];

async function checkApi(url) {
  const baseUrl = new URL(url);
  const [health, ready] = await Promise.all([
    fetch(new URL('/api/health', baseUrl), { signal: AbortSignal.timeout(5000) }),
    fetch(new URL('/api/ready', baseUrl), { signal: AbortSignal.timeout(5000) }),
  ]);
  if (!health.ok || !ready.ok) throw new Error('Los health checks HTTP no respondieron correctamente.');
}

async function main() {
  await loadPreproductionEnvironment();
  const [{ PrismaClient }, { config, validateRuntimeEnvironment }, { checkProductUploadDirectory }] = await Promise.all([
    import('@prisma/client'),
    import('../server/env.js'),
    import('../server/uploads.js'),
  ]);
  validateRuntimeEnvironment();
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
    `;
    const names = new Set(tables.map((table) => table.name));
    const missing = requiredTables.filter((table) => !names.has(table));
    if (missing.length) throw new Error(`Faltan tablas criticas: ${missing.join(', ')}.`);

    const migrations = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    if (!migrations[0]?.count) throw new Error('No se encontraron migraciones PostgreSQL aplicadas.');

    const activeAdmins = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
    if (!activeAdmins) throw new Error('No existe un administrador activo. Ejecuta npm run bootstrap:admin.');

    if (process.env.REQUIRE_NO_DEMO_USERS === 'true') {
      const demoUsers = await prisma.user.count({
        where: { isActive: true, email: { endsWith: '@demo.com', mode: 'insensitive' } },
      });
      if (demoUsers) throw new Error('Hay usuarios demo activos y REQUIRE_NO_DEMO_USERS=true.');
    }

    const uploads = await checkProductUploadDirectory();
    if (!uploads.ok) throw new Error('UPLOAD_DIR no existe o no permite escritura.');

    if (process.env.PREPROD_CHECK_API_URL) await checkApi(process.env.PREPROD_CHECK_API_URL);
    console.log(`Preproduccion verificada: PostgreSQL, ${migrations[0].count} migraciones, ${activeAdmins} administrador(es) activo(s), uploads y${process.env.PREPROD_CHECK_API_URL ? ' endpoints HTTP.' : ' configuracion HTTP pendiente de URL.'}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`preprod:check fallo: ${error.message}`);
  process.exitCode = 1;
});
