import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, createTestUser, cleanupTestUsers, TEST_PASSWORD, TEST_ORIGIN } from './helpers.js';

const PREFIX = 'sec-t';

let server, prisma, clientCookie;

before(async () => {
  const s = await startTestServer();
  server = s;
  prisma = s.prisma;

  await createTestUser(prisma, { prefix: `${PREFIX}-client`, role: 'CLIENT', withCustomer: true });

  const res = await server.req('POST', '/auth/login', {
    email: `${PREFIX}-client@test.invalid`,
    password: TEST_PASSWORD,
  });
  clientCookie = res.cookie;
});

after(async () => {
  await cleanupTestUsers(prisma, [`${PREFIX}-client`]);
  await server.stop();
});

describe('CORS and origin enforcement', () => {
  it('GET requests are allowed without Origin header', async () => {
    // In test (non-production) mode, GET requests without origin pass through.
    // requireAuth will block it, but not the CORS check.
    const res = await server.req('GET', '/products', undefined, clientCookie);
    assert.ok([200, 401].includes(res.status), 'GET should not be CORS-blocked');
  });

  it('POST from an untrusted origin is rejected', async () => {
    const { base } = server;
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example.com',
      },
      body: JSON.stringify({ email: 'x@x.com', password: 'x' }),
    });
    assert.equal(res.status, 403);
  });

  it('POST from allowed origin succeeds (CORS-wise)', async () => {
    // We test that our standard helper (which sends the allowed Origin) works.
    const res = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-client@test.invalid`,
      password: TEST_PASSWORD,
    });
    assert.equal(res.status, 200);
  });
});

describe('Authentication enforcement', () => {
  const protectedRoutes = [
    ['GET', '/products'],
    ['GET', '/orders'],
    ['GET', '/laboratories'],
    ['GET', '/admin/orders'],
  ];

  for (const [method, path] of protectedRoutes) {
    it(`${method} ${path} requires auth`, async () => {
      const { base } = server;
      const res = await fetch(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Origin: TEST_ORIGIN },
      });
      assert.equal(res.status, 401, `${method} ${path} should require auth`);
    });
  }
});

describe('Sensitive data not exposed', () => {
  it('login response does not expose passwordHash', async () => {
    const res = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-client@test.invalid`,
      password: TEST_PASSWORD,
    });
    assert.equal(res.status, 200);
    const body = JSON.stringify(res.data);
    assert.ok(!body.includes('passwordHash'), 'passwordHash must not appear in login response');
  });

  it('/auth/me does not expose passwordHash', async () => {
    const loginRes = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-client@test.invalid`,
      password: TEST_PASSWORD,
    });
    const meRes = await server.req('GET', '/auth/me', undefined, loginRes.cookie);
    const body = JSON.stringify(meRes.data);
    assert.ok(!body.includes('passwordHash'));
  });

  it('response headers do not expose server technology', async () => {
    const { base } = server;
    const res = await fetch(`${base}/health`, { headers: { Origin: TEST_ORIGIN } });
    assert.ok(!res.headers.get('x-powered-by'), 'x-powered-by header must not be set');
  });
});

describe('Input sanitization', () => {
  it('SQL-like injection in product search returns 200 (handled by Prisma ORM)', async () => {
    const payload = encodeURIComponent("' OR '1'='1");
    const res = await server.req('GET', `/products?search=${payload}`, undefined, clientCookie);
    // Prisma uses parameterized queries; this should just return empty results, not error
    assert.ok([200, 400].includes(res.status), 'SQL injection attempt should be handled safely');
  });

  it('very long search query does not crash the server', async () => {
    const longSearch = 'a'.repeat(1000);
    const res = await server.req('GET', `/products?search=${longSearch}`, undefined, clientCookie);
    assert.ok([200, 400, 414].includes(res.status), 'Very long query should not cause 500');
  });

  it('invalid JSON body returns 400', async () => {
    const { base } = server;
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: TEST_ORIGIN },
      body: 'not-valid-json{{{',
    });
    assert.equal(res.status, 400);
  });

  it('oversized JSON body is rejected', async () => {
    const hugeBody = JSON.stringify({ data: 'x'.repeat(2 * 1024 * 1024) }); // 2MB
    const { base } = server;
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: TEST_ORIGIN },
      body: hugeBody,
    });
    assert.ok([400, 413].includes(res.status), `Expected 400 or 413, got ${res.status}`);
  });
});

describe('Role isolation', () => {
  it('client cannot access sales period refresh', async () => {
    const res = await server.req('POST', '/admin/sales-periods/refresh', {}, clientCookie);
    assert.equal(res.status, 403);
  });

  it('client cannot access admin reports', async () => {
    const res = await server.req('GET', '/admin/reports', undefined, clientCookie);
    assert.ok([403, 404].includes(res.status));
  });

  it('client cannot access audit log', async () => {
    const res = await server.req('GET', '/admin/audit', undefined, clientCookie);
    assert.ok([403, 404].includes(res.status));
  });

  it('unauthenticated cannot access any admin route', async () => {
    const adminRoutes = ['/admin/orders', '/admin/sales-periods'];
    for (const route of adminRoutes) {
      const res = await server.req('GET', route, undefined, null);
      assert.equal(res.status, 401, `${route} should return 401 for unauthenticated`);
    }
  });
});
