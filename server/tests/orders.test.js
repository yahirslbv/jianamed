import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer, createTestUser, createTestLaboratory, createTestCategory, createTestProduct,
  cleanupTestUsers, cleanupTestLaboratories, cleanupTestCategories, TEST_PASSWORD,
} from './helpers.js';

const PREFIX = 'ord-t';
const LAB = `${PREFIX} Laboratorio`;
const CAT = `${PREFIX} Categoria`;
const SKU = `${PREFIX}-SKU-001`;

let server, prisma;
let clientCookie, adminCookie, otherCookie;
let product;

const checkout = {
  deliveryAddress: 'Av. Revolución 123',
  deliveryCity: 'Tijuana',
  deliveryState: 'Baja California',
  deliveryPostalCode: '22000',
  responsibleName: 'Juan Pérez',
  responsiblePhone: '6641234567',
};

before(async () => {
  const s = await startTestServer();
  server = s;
  prisma = s.prisma;

  await createTestUser(prisma, { prefix: `${PREFIX}-admin`, role: 'ADMIN' });
  await createTestUser(prisma, { prefix: `${PREFIX}-client`, role: 'CLIENT', withCustomer: true });
  await createTestUser(prisma, { prefix: `${PREFIX}-other`, role: 'CLIENT', withCustomer: true });

  const lab = await createTestLaboratory(prisma, LAB);
  const cat = await createTestCategory(prisma, CAT);
  product = await createTestProduct(prisma, { laboratoryId: lab.id, categoryId: cat.id, sku: SKU, priceCents: 5000, stock: 200 });

  const [adminRes, clientRes, otherRes] = await Promise.all([
    server.req('POST', '/auth/login', { email: `${PREFIX}-admin@test.invalid`, password: TEST_PASSWORD }),
    server.req('POST', '/auth/login', { email: `${PREFIX}-client@test.invalid`, password: TEST_PASSWORD }),
    server.req('POST', '/auth/login', { email: `${PREFIX}-other@test.invalid`, password: TEST_PASSWORD }),
  ]);
  adminCookie = adminRes.cookie;
  clientCookie = clientRes.cookie;
  otherCookie = otherRes.cookie;
});

after(async () => {
  await cleanupTestLaboratories(prisma, [LAB]);
  await cleanupTestCategories(prisma, [CAT]);
  await cleanupTestUsers(prisma, [`${PREFIX}-admin`, `${PREFIX}-client`, `${PREFIX}-other`]);
  await server.stop();
});

describe('POST /orders — validation', () => {
  it('rejects empty items array', async () => {
    const res = await server.req('POST', '/orders', { items: [], checkout }, clientCookie);
    assert.equal(res.status, 400);
  });

  it('rejects missing items field', async () => {
    const res = await server.req('POST', '/orders', { checkout }, clientCookie);
    assert.equal(res.status, 400);
  });

  it('rejects zero quantity', async () => {
    const res = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 0 }], checkout,
    }, clientCookie);
    assert.equal(res.status, 400);
  });

  it('rejects quantity exceeding stock', async () => {
    const res = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 99999 }], checkout,
    }, clientCookie);
    assert.equal(res.status, 400);
  });

  it('rejects non-existent productId', async () => {
    const res = await server.req('POST', '/orders', {
      items: [{ productId: 'nonexistent-id', quantity: 1 }], checkout,
    }, clientCookie);
    assert.equal(res.status, 400);
  });

  it('admin cannot create orders (only clients)', async () => {
    const res = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 1 }], checkout,
    }, adminCookie);
    assert.equal(res.status, 403);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 1 }], checkout,
    }, null);
    assert.equal(res.status, 401);
  });
});

describe('Full order lifecycle', () => {
  let orderId, orderFolio;

  it('client creates order successfully', async () => {
    const res = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 3 }], checkout,
    }, clientCookie);
    assert.equal(res.status, 201, JSON.stringify(res.data));
    assert.ok(res.data.order);
    assert.equal(res.data.order.status, 'PENDING_REVIEW');
    assert.ok(res.data.order.folio?.startsWith('PED-'), `folio format invalid: ${res.data.order.folio}`);
    assert.ok(Array.isArray(res.data.order.items));
    assert.equal(res.data.order.items.length, 1);
    assert.equal(res.data.order.items[0].quantity, 3);
    orderId = res.data.order.id;
    orderFolio = res.data.order.folio;
  });

  it('client can see their own order', async () => {
    const res = await server.req('GET', `/orders/${orderId}`, undefined, clientCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.order.id, orderId);
    assert.equal(res.data.order.folio, orderFolio);
  });

  it('other client cannot see this order', async () => {
    const res = await server.req('GET', `/orders/${orderId}`, undefined, otherCookie);
    assert.equal(res.status, 404);
  });

  it('admin can see all orders', async () => {
    const res = await server.req('GET', '/admin/orders', undefined, adminCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.orders));
    assert.ok(res.data.orders.some((o) => o.id === orderId));
  });

  it('admin approves the order', async () => {
    const res = await server.req('PATCH', `/admin/orders/${orderId}/status`, { status: 'APPROVED' }, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.order.status, 'APPROVED');
  });

  it('client cannot cancel an approved order', async () => {
    const res = await server.req('PATCH', `/orders/${orderId}/cancel`, {}, clientCookie);
    assert.ok([400, 409].includes(res.status), `Expected 400/409, got ${res.status}`);
  });

  it('admin marks order as supplied', async () => {
    const res = await server.req('PATCH', `/admin/orders/${orderId}/status`, { status: 'SUPPLIED' }, adminCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.order.status, 'SUPPLIED');
  });

  it('client sees final status as SUPPLIED', async () => {
    const res = await server.req('GET', `/orders/${orderId}`, undefined, clientCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.order.status, 'SUPPLIED');
  });
});

describe('Order cancellation', () => {
  let cancelOrderId;

  it('client creates a cancellable order', async () => {
    const res = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 1 }], checkout,
    }, clientCookie);
    assert.equal(res.status, 201);
    cancelOrderId = res.data.order.id;
  });

  it('client can cancel a PENDING_REVIEW order', async () => {
    const res = await server.req('PATCH', `/orders/${cancelOrderId}/cancel`, {}, clientCookie);
    assert.equal(res.status, 200);
    assert.equal(res.data.order?.status ?? res.data.status, 'CANCELLED');
  });

  it('stock is restored after cancellation', async () => {
    const prod = await prisma.product.findUnique({ where: { id: product.id } });
    // The stock should have been restored (+1 from cancellation)
    assert.ok(prod.stock >= product.stock - 3, 'stock should be partially restored');
  });
});

describe('Admin status enforcement', () => {
  it('completely invalid status string returns 400', async () => {
    const createRes = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 1 }], checkout,
    }, clientCookie);
    assert.equal(createRes.status, 201);
    const id = createRes.data.order.id;

    // Sending a status that is not in ORDER_STATUSES enum should be rejected
    const res = await server.req('PATCH', `/admin/orders/${id}/status`, { status: 'HACKED_STATUS' }, adminCookie);
    assert.equal(res.status, 400);
  });

  it('client cannot change status via admin endpoint', async () => {
    const createRes = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 1 }], checkout,
    }, clientCookie);
    const id = createRes.data.order.id;

    const res = await server.req('PATCH', `/admin/orders/${id}/status`, { status: 'APPROVED' }, clientCookie);
    assert.equal(res.status, 403);
  });
});

describe('GET /orders', () => {
  it('client lists their own orders and not other users orders', async () => {
    // Create an order for the OTHER client
    const otherOrderRes = await server.req('POST', '/orders', {
      items: [{ productId: product.id, quantity: 1 }], checkout,
    }, otherCookie);
    assert.equal(otherOrderRes.status, 201);
    const otherOrderId = otherOrderRes.data.order.id;

    // The main client lists their orders
    const res = await server.req('GET', '/orders', undefined, clientCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.orders));

    // The other client's order must NOT appear in this list
    const orderIds = res.data.orders.map((o) => o.id);
    assert.ok(!orderIds.includes(otherOrderId), "Other client's order must not appear in client's list");
  });
});
