import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const stagingEnvPath = path.join(projectRoot, '.env.staging');

export async function loadStagingEnvironment() {
  try {
    await access(stagingEnvPath);
    dotenv.config({ path: stagingEnvPath });
  } catch {
    // Explicit shell variables remain supported for CI and one-off staging commands.
  }
}

export function assertStagingEnvironment() {
  const failures = [];
  const databaseUrl = String(process.env.DATABASE_URL || '');
  const sessionSecret = String(process.env.SESSION_SECRET || '');
  const frontendOrigins = String(process.env.FRONTEND_ORIGINS || '');

  if (process.env.STAGING_ENVIRONMENT !== 'true') failures.push('STAGING_ENVIRONMENT debe ser true.');
  if (process.env.NODE_ENV !== 'production') failures.push('NODE_ENV debe ser production para validar staging.');
  if (!/^postgres(?:ql)?:\/\//i.test(databaseUrl)) failures.push('DATABASE_URL debe apuntar a PostgreSQL, nunca a SQLite.');
  if (sessionSecret.length < 32 || /replace-with|change-(?:me|this)|secret$/i.test(sessionSecret)) {
    failures.push('SESSION_SECRET debe ser largo, aleatorio y no usar un valor de ejemplo.');
  }
  if (!frontendOrigins || frontendOrigins.includes('*')) failures.push('FRONTEND_ORIGINS debe contener origenes explicitos y sin comodines.');
  if (process.env.COOKIE_SECURE !== 'true' && process.env.STAGING_LOCAL !== 'true') {
    failures.push('COOKIE_SECURE solo puede ser false cuando STAGING_LOCAL=true.');
  }

  if (failures.length) {
    throw new Error(`Configuracion de staging invalida:\n- ${failures.join('\n- ')}`);
  }
}
