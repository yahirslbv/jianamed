import { access, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const fromIndex = args.indexOf('--from');
const source = fromIndex >= 0 ? args[fromIndex + 1] : null;
const confirmed = args.includes('--confirm');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'server', 'prisma', 'dev.db');

if (!confirmed || !source) {
  console.error('Uso: npm run db:restore:local -- --from <archivo.db> --confirm');
  console.error('La restauración reemplaza server/prisma/dev.db únicamente después de esa confirmación explícita.');
  process.exitCode = 1;
} else if (!process.env.DATABASE_URL?.startsWith('file:') && process.env.NODE_ENV === 'production') {
  console.error('La restauración local está bloqueada en producción. Restaura PostgreSQL con pg_restore.');
  process.exitCode = 1;
} else {
  try {
    const resolvedSource = path.resolve(source);
    await access(resolvedSource);
    await copyFile(resolvedSource, destination);
    console.log(`Base local restaurada desde: ${resolvedSource}`);
  } catch (error) {
    console.error(`No se pudo restaurar la base local: ${error.message}`);
    process.exitCode = 1;
  }
}
