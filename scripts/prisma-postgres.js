import { spawn } from 'node:child_process';
import { loadStagingEnvironment, projectRoot } from './staging-env.js';

const action = process.argv[2];
const actionArguments = {
  'migrate-deploy': ['prisma', 'migrate', 'deploy', '--schema', 'server/prisma/postgresql/schema.prisma'],
  studio: ['prisma', 'studio', '--schema', 'server/prisma/postgresql/schema.prisma'],
}[action];

if (!actionArguments) {
  console.error('Uso: node scripts/prisma-postgres.js <migrate-deploy|studio>');
  process.exitCode = 1;
} else {
  await loadStagingEnvironment();
  if (!/^postgres(?:ql)?:\/\//i.test(String(process.env.DATABASE_URL || ''))) {
    console.error('DATABASE_URL debe apuntar a PostgreSQL. Define variables de staging o copia .env.staging.example a .env.staging.');
    process.exitCode = 1;
  } else {
    const isWindows = process.platform === 'win32';
    const command = isWindows ? (process.env.ComSpec || 'cmd.exe') : 'npx';
    const args = isWindows ? ['/d', '/s', '/c', `npx ${actionArguments.join(' ')}`] : actionArguments;
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', (error) => {
      console.error(`No fue posible ejecutar Prisma: ${error.message}`);
      process.exitCode = 1;
    });
    child.on('exit', (code) => {
      if (code) process.exitCode = code;
    });
  }
}
