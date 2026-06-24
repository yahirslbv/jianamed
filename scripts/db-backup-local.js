import { access, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'server', 'prisma', 'dev.db');
const backupDirectory = path.join(root, 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const destination = path.join(backupDirectory, `dev-${timestamp}.db`);

try {
  await access(source);
  await mkdir(backupDirectory, { recursive: true });
  await copyFile(source, destination);
  console.log(`Backup local creado: ${destination}`);
} catch (error) {
  console.error(`No se pudo crear el backup local: ${error.message}`);
  process.exitCode = 1;
}
