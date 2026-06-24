import { spawn } from 'node:child_process';
import { isPostgresUrl, loadPreproductionEnvironment, projectRoot } from './deployment-env.js';

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: projectRoot, env: process.env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Seed termino con codigo ${code}.`)));
  });
}

async function main() {
  await loadPreproductionEnvironment();
  if (isPostgresUrl()) {
    if (process.env.STAGING_ENVIRONMENT !== 'true' || process.env.STAGING_LOCAL !== 'true') {
      throw new Error('El seed demo PostgreSQL solo se permite en staging local controlado.');
    }
    await run(process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm', process.platform === 'win32'
      ? ['/d', '/s', '/c', 'npm run prisma:seed:postgres']
      : ['run', 'prisma:seed:postgres']);
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed demo SQLite esta bloqueado cuando NODE_ENV=production.');
  }
  await run(process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npx', process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npx prisma db seed --schema server/prisma/schema.prisma']
    : ['prisma', 'db', 'seed', '--schema', 'server/prisma/schema.prisma']);
}

main().catch((error) => {
  console.error(`seed:safe fallo: ${error.message}`);
  process.exitCode = 1;
});
