import { access, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'server', 'prisma', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith('file:')) {
  console.log('DATABASE_URL no corresponde a SQLite local; no se crea ningún archivo.');
  process.exit(0);
}

const relativeFile = databaseUrl.slice('file:'.length).split('?')[0];
const filePath = path.resolve(root, 'server', 'prisma', relativeFile);

try {
  await access(filePath);
} catch {
  await mkdir(path.dirname(filePath), { recursive: true });
  const handle = await open(filePath, 'a');
  await handle.close();
  console.log(`Base SQLite local inicializada: ${filePath}`);
}
