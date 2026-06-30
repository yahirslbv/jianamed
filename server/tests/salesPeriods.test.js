import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer, createTestUser, createTestLaboratory, createTestCategory, createTestProduct,
  cleanupTestUsers, cleanupTestLaboratories, cleanupTestCategories, TEST_PASSWORD,
} from './helpers.js';

const PREFIX = 'sp-t';
const LAB = `${PREFIX} Lab`;
const CAT = `${PREFIX} Cat`;
const SKU = `${PREFIX}-SKU`;

let server, prisma, adminCookie, clientCookie, productId;

before(async () => {
  const s = await startTestServer();
  server = s;
  prisma = s.prisma;

  await createTestUser(prisma, { prefix: `${PREFIX}-admin`, role: 'ADMIN' });
  await createTestUser(prisma, { prefix: `${PREFIX}-client`, role: 'CLIENT', withCustomer: true });

  const lab = await createTestLaboratory(prisma, LAB);
  const cat = await createTestCategory(prisma, CAT);
  const prod = await createTestProduct(prisma, { laboratoryId: lab.id, categoryId: cat.id, sku: SKU, priceCents: 10000, stock: 500 });
  productId = prod.id;

  const [ar, cr] = await Promise.all([
    server.req('POST', '/auth/login', { email: `${PREFIX}-admin@test.invalid`, password: TEST_PASSWORD }),
    server.req('POST', '/auth/login', { email: `${PREFIX}-client@test.invalid`, password: TEST_PASSWORD }),
  ]);
  adminCookie = ar.cookie;
  clientCookie = cr.cookie;

  // Create a SUPPLIED order so period refresh has data to compute
  const checkout = {
    deliveryAddress: 'Calle Test 1', deliveryCity: 'Tijuana',
    deliveryState: 'BC', deliveryPostalCode: '22000',
    responsibleName: 'Test', responsiblePhone: '6640000000',
  };
  const createRes = await server.req('POST', '/orders', {
    items: [{ productId, quantity: 5 }], checkout,
  }, clientCookie);
  if (createRes.status === 201) {
    const orderId = createRes.data.order.id;
    await server.req('PATCH', `/admin/orders/${orderId}/status`, { status: 'APPROVED' }, adminCookie);
    await server.req('PATCH', `/admin/orders/${orderId}/status`, { status: 'SUPPLIED' }, adminCookie);
  }
});

after(async () => {
  await prisma.salesPeriod.deleteMany({}).catch(() => {});
  await cleanupTestLaboratories(prisma, [LAB]);
  await cleanupTestCategories(prisma, [CAT]);
  await cleanupTestUsers(prisma, [`${PREFIX}-admin`, `${PREFIX}-client`]);
  await server.stop();
});

describe('GET /admin/sales-periods', () => {
  it('requires authentication', async () => {
    const res = await server.req('GET', '/admin/sales-periods', undefined, null);
    assert.equal(res.status, 401);
  });

  it('client cannot access admin sales periods', async () => {
    const res = await server.req('GET', '/admin/sales-periods', undefined, clientCookie);
    assert.equal(res.status, 403);
  });

  it('admin can fetch periods (may be empty before refresh)', async () => {
    const res = await server.req('GET', '/admin/sales-periods?type=MONTHLY&limit=3', undefined, adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.periods), 'periods must be an array');
  });

  it('invalid type silently defaults to MONTHLY and returns 200', async () => {
    const res = await server.req('GET', '/admin/sales-periods?type=INVALID', undefined, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.type, 'MONTHLY', 'invalid type should default to MONTHLY');
  });
});

describe('POST /admin/sales-periods/refresh', () => {
  it('requires admin role', async () => {
    const res = await server.req('POST', '/admin/sales-periods/refresh', {}, clientCookie);
    assert.equal(res.status, 403);
  });

  it('requires authentication', async () => {
    const res = await server.req('POST', '/admin/sales-periods/refresh', {}, null);
    assert.equal(res.status, 401);
  });

  it('admin can trigger refresh', async () => {
    const res = await server.req('POST', '/admin/sales-periods/refresh', {}, adminCookie);
    assert.equal(res.status, 200);
    assert.ok(res.data.message || res.data.success !== undefined, 'must return confirmation');
  });

  it('after refresh, periods exist with revenue data', async () => {
    // Refresh first
    await server.req('POST', '/admin/sales-periods/refresh', {}, adminCookie);

    const res = await server.req('GET', '/admin/sales-periods?type=MONTHLY&limit=1', undefined, adminCookie);
    assert.equal(res.status, 200);
    assert.ok(res.data.periods.length > 0, 'at least one period must exist after refresh with SUPPLIED order');

    const period = res.data.periods[0];
    assert.ok(period.revenueCents >= 0, 'revenueCents must be non-negative');
    assert.ok(period.orderCount >= 0, 'orderCount must be non-negative');
    assert.ok(period.unitsSold >= 0, 'unitsSold must be non-negative');
    assert.ok(typeof period.periodType === 'string', 'periodType must be a string');
    assert.ok(period.label, 'label must be present');
  });

  it('period data includes projection fields', async () => {
    const res = await server.req('GET', '/admin/sales-periods?type=MONTHLY&limit=1', undefined, adminCookie);
    assert.equal(res.status, 200);
    if (res.data.periods.length > 0) {
      const period = res.data.periods[0];
      assert.ok('projectedRevenueCents' in period, 'projectedRevenueCents must be present');
      assert.ok('projectedOrderCount' in period, 'projectedOrderCount must be present');
    }
  });
});

describe('Sales period types', () => {
  const types = ['DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL'];

  for (const type of types) {
    it(`accepts type=${type}`, async () => {
      const res = await server.req('GET', `/admin/sales-periods?type=${type}&limit=3`, undefined, adminCookie);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data.periods));
    });
  }
});
