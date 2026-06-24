import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { assertStagingEnvironment, loadStagingEnvironment, projectRoot } from './staging-env.js';

const expectedTables = [
  'User', 'Customer', 'Laboratory', 'Category', 'Product', 'Offer', 'InventoryLot',
  'Order', 'OrderItem', 'AuditLog', 'Session', 'ImportBatch', 'OrderFolioSequence',
];
const expectedEnums = ['UserRole', 'OrderStatus', 'ProductType', 'HealthFraction', 'OfferDiscountType', 'CreditStatus'];
const expectedIndexes = [
  'User_role_isActive_idx', 'User_email_key', 'Product_sku_key', 'Order_folio_key',
  'Session_sessionTokenHash_key', 'Customer_isAuthorized_idx', 'Product_laboratoryId_idx',
  'Product_categoryId_idx', 'Product_isActive_idx', 'Order_status_idx', 'Order_createdAt_idx',
  'AuditLog_createdAt_idx', 'ImportBatch_status_createdAt_idx',
];

function assertExpected(label, expected, actual) {
  const actualSet = new Set(actual);
  const missing = expected.filter((item) => !actualSet.has(item));
  if (missing.length) throw new Error(`${label} faltantes: ${missing.join(', ')}`);
}

async function main() {
  await loadStagingEnvironment();
  assertStagingEnvironment();
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    const tables = await prisma.$queryRaw`
      SELECT table_name AS name
      FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
    `;
    const enums = await prisma.$queryRaw`
      SELECT type.typname AS name
      FROM pg_type AS type
      INNER JOIN pg_namespace AS namespace ON namespace.oid = type.typnamespace
      WHERE namespace.nspname = current_schema() AND type.typtype = 'e'
    `;
    const indexes = await prisma.$queryRaw`
      SELECT indexname AS name
      FROM pg_indexes
      WHERE schemaname = current_schema()
    `;
    const moneyColumns = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = current_schema() AND column_name LIKE '%Cents'
    `;
    const migrationRows = await prisma.$queryRaw`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    const migrationDirectory = path.join(projectRoot, 'server', 'prisma', 'postgresql', 'migrations');
    const migrationNames = (await readdir(migrationDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    assertExpected('Tablas', expectedTables, tables.map((row) => row.name));
    assertExpected('Enums', expectedEnums, enums.map((row) => row.name));
    assertExpected('Indices', expectedIndexes, indexes.map((row) => row.name));
    assertExpected('Migraciones aplicadas', migrationNames, migrationRows.map((row) => row.migration_name));

    const nonIntegerMoneyColumns = moneyColumns.filter((column) => column.data_type !== 'integer');
    if (nonIntegerMoneyColumns.length) {
      throw new Error(`Columnas monetarias que no son enteros: ${nonIntegerMoneyColumns.map((column) => `${column.table_name}.${column.column_name}`).join(', ')}`);
    }

    console.log(`Staging PostgreSQL verificado: ${tables.length} tablas, ${enums.length} enums, ${indexes.length} indices y ${migrationRows.length} migraciones aplicadas.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`staging:check fallo: ${error.message}`);
  process.exitCode = 1;
});
