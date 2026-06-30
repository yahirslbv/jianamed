import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, createTestUser, cleanupTestUsers, TEST_PASSWORD } from './helpers.js';

const PREFIX = 'auth-t';

let server, prisma;
let adminCookie, clientCookie;

before(async () => {
  server = await startTestServer();
  prisma = server.prisma;

  await createTestUser(prisma, { prefix: `${PREFIX}-admin`, role: 'ADMIN' });
  await createTestUser(prisma, { prefix: `${PREFIX}-client`, role: 'CLIENT', withCustomer: true });
});

after(async () => {
  await cleanupTestUsers(prisma, [`${PREFIX}-admin`, `${PREFIX}-client`]);
  await server.stop();
});

describe('POST /auth/login', () => {
  it('rejects missing fields', async () => {
    const res = await server.req('POST', '/auth/login', {});
    assert.ok([400, 401].includes(res.status));
  });

  it('rejects wrong password', async () => {
    const res = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-admin@test.invalid`,
      password: 'WrongPassword!',
    });
    assert.equal(res.status, 401);
  });

  it('rejects non-existent email', async () => {
    const res = await server.req('POST', '/auth/login', {
      email: 'nobody@test.invalid',
      password: TEST_PASSWORD,
    });
    assert.equal(res.status, 401);
  });

  it('accepts correct admin credentials and returns user data', async () => {
    const res = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-admin@test.invalid`,
      password: TEST_PASSWORD,
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.user);
    assert.equal(res.data.user.email, `${PREFIX}-admin@test.invalid`);
    assert.equal(res.data.user.role, 'admin');
    assert.ok(!res.data.user.passwordHash, 'password hash must not be exposed');
    assert.ok(res.cookie, 'session cookie must be set');
    adminCookie = res.cookie;
  });

  it('accepts correct client credentials', async () => {
    const res = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-client@test.invalid`,
      password: TEST_PASSWORD,
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.user.role, 'client');
    clientCookie = res.cookie;
  });

  it('response does not expose internal fields', async () => {
    const res = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-client@test.invalid`,
      password: TEST_PASSWORD,
    });
    const body = JSON.stringify(res.data);
    assert.ok(!body.includes('passwordHash'));
    assert.ok(!body.includes('sessionId'));
  });
});

describe('GET /auth/me', () => {
  it('returns 401 without cookie', async () => {
    const res = await server.req('GET', '/auth/me', undefined, null);
    assert.equal(res.status, 401);
  });

  it('returns user profile with valid session', async () => {
    const loginRes = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-admin@test.invalid`,
      password: TEST_PASSWORD,
    });
    const res = await server.req('GET', '/auth/me', undefined, loginRes.cookie);
    assert.equal(res.status, 200);
    assert.ok(res.data.user);
    assert.equal(res.data.user.email, `${PREFIX}-admin@test.invalid`);
  });

  it('client response includes customer data', async () => {
    const loginRes = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-client@test.invalid`,
      password: TEST_PASSWORD,
    });
    const res = await server.req('GET', '/auth/me', undefined, loginRes.cookie);
    assert.equal(res.status, 200);
    assert.ok(res.data.user.customer, 'client user must have customer record');
    assert.ok(res.data.user.customer.businessName);
  });
});

describe('POST /auth/logout', () => {
  it('returns 204 and session is invalidated', async () => {
    const loginRes = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-admin@test.invalid`,
      password: TEST_PASSWORD,
    });
    const cookie = loginRes.cookie;
    assert.ok(cookie);

    const logoutRes = await server.req('POST', '/auth/logout', {}, cookie);
    assert.equal(logoutRes.status, 204);

    // After logout, the same cookie should not work
    const meRes = await server.req('GET', '/auth/me', undefined, cookie);
    assert.equal(meRes.status, 401);
  });
});

describe('Role-based access', () => {
  it('client cannot access admin orders endpoint', async () => {
    const loginRes = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-client@test.invalid`,
      password: TEST_PASSWORD,
    });
    const res = await server.req('GET', '/admin/orders', undefined, loginRes.cookie);
    assert.equal(res.status, 403);
  });

  it('admin can access admin orders endpoint', async () => {
    const loginRes = await server.req('POST', '/auth/login', {
      email: `${PREFIX}-admin@test.invalid`,
      password: TEST_PASSWORD,
    });
    const res = await server.req('GET', '/admin/orders', undefined, loginRes.cookie);
    assert.ok([200, 404].includes(res.status), `Expected 200 or 404, got ${res.status}`);
  });

  it('unauthenticated request to protected route returns 401', async () => {
    const routes = ['/products', '/orders', '/admin/orders'];
    for (const route of routes) {
      const res = await server.req('GET', route, undefined, null);
      assert.equal(res.status, 401, `Expected 401 for ${route}`);
    }
  });
});

describe('GET /api/health', () => {
  it('responds without authentication', async () => {
    const res = await server.req('GET', '/health', undefined, null);
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'ok');
  });
});
