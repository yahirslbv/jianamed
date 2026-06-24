import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Loads an ignored local preproduction file when present. Hosted deployments
 * normally inject the same values as environment variables, which take priority.
 */
export async function loadPreproductionEnvironment() {
  const file = process.env.DEPLOYMENT_ENV_FILE || path.join(projectRoot, '.env.preproduction');
  try {
    await access(file);
    dotenv.config({ path: file, override: false });
  } catch {
    // Shell and provider-injected variables are valid deployment configuration.
  }
}

export function isPostgresUrl(value = process.env.DATABASE_URL) {
  return /^postgres(?:ql)?:\/\//i.test(String(value || ''));
}
