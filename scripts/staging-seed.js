import { spawn } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { assertStagingEnvironment, loadStagingEnvironment, projectRoot } from './staging-env.js';

function runPrismaSeed() {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npx';
  const args = isWindows
    ? ['/d', '/s', '/c', 'npx prisma db seed --schema server/prisma/postgresql/schema.prisma']
    : ['prisma', 'db', 'seed', '--schema', 'server/prisma/postgresql/schema.prisma'];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Prisma seed termino con codigo ${code}.`)));
  });
}

async function main() {
  await loadStagingEnvironment();
  assertStagingEnvironment();
  const prisma = new PrismaClient();

  try {
    const counts = await Promise.all([
      ['User', () => prisma.user.count()],
      ['Customer', () => prisma.customer.count()],
      ['Laboratory', () => prisma.laboratory.count()],
      ['Category', () => prisma.category.count()],
      ['Product', () => prisma.product.count()],
      ['Offer', () => prisma.offer.count()],
      ['InventoryLot', () => prisma.inventoryLot.count()],
      ['Order', () => prisma.order.count()],
      ['OrderItem', () => prisma.orderItem.count()],
      ['AuditLog', () => prisma.auditLog.count()],
      ['Session', () => prisma.session.count()],
      ['ImportBatch', () => prisma.importBatch.count()],
      ['OrderFolioSequence', () => prisma.orderFolioSequence.count()],
    ].map(async ([table, count]) => ({ table, count: await count() })));
    const populated = counts.filter((item) => item.count > 0);
    if (populated.length) {
      throw new Error(`La base de staging no esta vacia; seed bloqueado (${populated.map((item) => `${item.table}=${item.count}`).join(', ')}).`);
    }
  } finally {
    await prisma.$disconnect();
  }

  await runPrismaSeed();
  console.log('Seed demo aplicado solo a una base de staging vacia. Nunca lo ejecutes en produccion real.');
}

main().catch((error) => {
  console.error(`staging seed fallo: ${error.message}`);
  process.exitCode = 1;
});
