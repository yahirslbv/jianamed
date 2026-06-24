import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { projectRoot } from './staging-env.js';

const action = process.argv[2];
const actionArguments = {
  up: ['up', '-d'],
  down: ['down'],
  logs: ['logs', '--tail', '200', '-f'],
}[action];

if (!actionArguments) {
  console.error('Uso: node scripts/postgres-compose.js <up|down|logs>');
  process.exitCode = 1;
} else {
  const bundledDocker = process.platform === 'win32'
    ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe')
    : null;
  const dockerCommand = bundledDocker && existsSync(bundledDocker) ? bundledDocker : 'docker';
  const child = spawn(dockerCommand, ['compose', '-f', path.join(projectRoot, 'docker-compose.postgres.yml'), ...actionArguments], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    if (error.code === 'ENOENT') {
      console.error('Docker Desktop con Docker Compose v2 es necesario para levantar PostgreSQL de staging.');
    } else {
      console.error(`No fue posible ejecutar Docker Compose: ${error.message}`);
    }
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    if (code) process.exitCode = code;
  });
}
