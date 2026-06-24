import { assertStagingEnvironment, loadStagingEnvironment } from './staging-env.js';

let sessionCookie = '';

function originHeader() {
  return String(process.env.FRONTEND_ORIGINS).split(',')[0].trim();
}

async function request(apiUrl, path, { method = 'GET', body, authenticated = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (authenticated) headers.Cookie = sessionCookie;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) headers.Origin = originHeader();

  const response = await fetch(new URL(path, apiUrl), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${path} respondio ${response.status}.`);
  return response;
}

async function main() {
  await loadStagingEnvironment();
  assertStagingEnvironment();
  const apiUrl = new URL(process.env.STAGING_API_URL || 'http://127.0.0.1:4000');
  const isLocalTarget = ['127.0.0.1', 'localhost', '::1'].includes(apiUrl.hostname);
  if (!isLocalTarget && process.env.STAGING_SMOKE_ALLOW_REMOTE !== 'true') {
    throw new Error('El smoke test remoto requiere STAGING_SMOKE_ALLOW_REMOTE=true.');
  }

  await request(apiUrl, '/api/health');
  const login = await request(apiUrl, '/api/auth/login', {
    method: 'POST',
    body: {
      email: process.env.STAGING_SMOKE_ADMIN_EMAIL || 'admin@demo.com',
      password: process.env.STAGING_SMOKE_ADMIN_PASSWORD || 'admin123',
    },
  });
  const rawCookie = typeof login.headers.getSetCookie === 'function'
    ? login.headers.getSetCookie()[0]
    : login.headers.get('set-cookie');
  sessionCookie = rawCookie?.split(';')[0] || '';
  if (!sessionCookie) throw new Error('Login no devolvio una cookie de sesion.');

  await request(apiUrl, '/api/auth/me', { authenticated: true });
  await request(apiUrl, '/api/products', { authenticated: true });
  await request(apiUrl, '/api/admin/users', { authenticated: true });
  await request(apiUrl, '/api/admin/customers', { authenticated: true });
  await request(apiUrl, '/api/admin/orders', { authenticated: true });
  await request(apiUrl, '/api/admin/reports/products', { authenticated: true });
  await request(apiUrl, '/api/auth/logout', { method: 'POST', authenticated: true });

  console.log('Smoke test de staging completado: health, sesion, catalogo y rutas administrativas respondieron correctamente.');
}

main().catch((error) => {
  console.error(`staging:smoke fallo: ${error.message}`);
  process.exitCode = 1;
});
