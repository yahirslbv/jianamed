import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer, createTestUser, createTestLaboratory, createTestCategory, createTestProduct,
  cleanupTestUsers, cleanupTestLaboratories, cleanupTestCategories, TEST_PASSWORD,
} from './helpers.js';
import { finalizeCheckoutSession } from '../routes/payments.js';

const PREFIX = 'pay-t';
const LAB = `${PREFIX} Laboratorio`;
const CAT = `${PREFIX} Categoria`;
const SKU = `${PREFIX}-SKU-001`;

let server, prisma;
let client, clientCookie;
let product;

const checkoutData = {
  clientName: 'Cliente Demo', clientEmail: 'cliente@test.invalid',
  deliveryAddress: 'Av. Revolución 123', deliveryCity: 'Tijuana', deliveryState: 'Baja California',
  deliveryPostalCode: '22000', responsibleName: 'Juan Pérez', responsiblePhone: '6641234567',
};

function fakeStripeSession(id) {
  return { id, payment_method_types: ['card'], payment_method_configuration_details: null };
}

async function createPendingCheckout(sessionId, overrides = {}) {
  return prisma.pendingCheckout.create({
    data: {
      userId: client.id,
      stripeSessionId: sessionId,
      cartJson: JSON.stringify([{ productId: product.id, quantity: 2 }]),
      checkoutJson: JSON.stringify(checkoutData),
      observations: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      ...overrides,
    },
  });
}

before(async () => {
  const s = await startTestServer();
  server = s;
  prisma = s.prisma;

  client = await createTestUser(prisma, { prefix: `${PREFIX}-client`, role: 'CLIENT', withCustomer: true });

  const lab = await createTestLaboratory(prisma, LAB);
  const cat = await createTestCategory(prisma, CAT);
  product = await createTestProduct(prisma, { laboratoryId: lab.id, categoryId: cat.id, sku: SKU, priceCents: 5000, stock: 200 });

  const loginRes = await server.req('POST', '/auth/login', { email: `${PREFIX}-client@test.invalid`, password: TEST_PASSWORD });
  clientCookie = loginRes.cookie;
});

after(async () => {
  await cleanupTestLaboratories(prisma, [LAB]);
  await cleanupTestCategories(prisma, [CAT]);
  await cleanupTestUsers(prisma, [`${PREFIX}-client`]);
  await server.stop();
});

describe('finalizeCheckoutSession — paid order creation', () => {
  // Regression test for Prisma P2028 (transaction timeout): writeAuditLog was called
  // without the transaction client (tx) inside prisma.$transaction(), which deadlocks
  // against the transaction's write lock on SQLite. This bug never surfaced through the
  // Stripe webhook in local development (the webhook can't reach localhost), only once
  // the confirm-on-redirect endpoint started calling this function directly.
  it('creates a PAID order without throwing or timing out', async () => {
    const sessionId = `cs_test_${PREFIX}_001`;
    await createPendingCheckout(sessionId);

    const order = await finalizeCheckoutSession(fakeStripeSession(sessionId));

    assert.ok(order, 'finalizeCheckoutSession should return the created order');
    assert.equal(order.stripeSessionId, sessionId);
    assert.equal(order.paymentStatus, 'PAID');
    assert.equal(order.status, 'PENDING_REVIEW');
    assert.ok(order.paidAt);
    assert.equal(order.items.length, 1);
    assert.equal(order.items[0].quantity, 2);
    assert.equal(order.totalCents, 5000 * 2);
  });

  it('deletes the PendingCheckout after creating the order', async () => {
    const sessionId = `cs_test_${PREFIX}_002`;
    const pending = await createPendingCheckout(sessionId);

    await finalizeCheckoutSession(fakeStripeSession(sessionId));

    const stillPending = await prisma.pendingCheckout.findUnique({ where: { id: pending.id } });
    assert.equal(stillPending, null);
  });

  it('writes an audit log entry for the paid order', async () => {
    const sessionId = `cs_test_${PREFIX}_003`;
    await createPendingCheckout(sessionId);

    const order = await finalizeCheckoutSession(fakeStripeSession(sessionId));

    const log = await prisma.auditLog.findFirst({ where: { entity: 'Order', entityId: order.id, action: 'CREATE' } });
    assert.ok(log, 'expected an audit log entry for the created order');
    assert.equal(log.userId, client.id);
  });

  it('decrements product stock', async () => {
    const before_ = await prisma.product.findUnique({ where: { id: product.id } });
    const sessionId = `cs_test_${PREFIX}_004`;
    await createPendingCheckout(sessionId);

    await finalizeCheckoutSession(fakeStripeSession(sessionId));

    const after_ = await prisma.product.findUnique({ where: { id: product.id } });
    assert.equal(after_.stock, before_.stock - 2);
  });

  it('is idempotent — calling it twice for the same session returns the same order', async () => {
    const sessionId = `cs_test_${PREFIX}_005`;
    await createPendingCheckout(sessionId);

    const first = await finalizeCheckoutSession(fakeStripeSession(sessionId));
    const second = await finalizeCheckoutSession(fakeStripeSession(sessionId));

    assert.equal(second.id, first.id);
    const orderCount = await prisma.order.count({ where: { stripeSessionId: sessionId } });
    assert.equal(orderCount, 1);
  });

  it('returns null when there is no matching PendingCheckout', async () => {
    const order = await finalizeCheckoutSession(fakeStripeSession(`cs_test_${PREFIX}_nonexistent`));
    assert.equal(order, null);
  });
});

describe('POST /payments/confirm', () => {
  it('returns the existing order without re-finalizing when it was already created', async () => {
    const sessionId = `cs_test_${PREFIX}_006`;
    await createPendingCheckout(sessionId);
    const created = await finalizeCheckoutSession(fakeStripeSession(sessionId));

    const res = await server.req('POST', '/payments/confirm', { sessionId }, clientCookie);
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.order.id, created.id);
    assert.equal(res.data.order.paymentStatus, 'PAID');
  });

  it('rejects requests without a sessionId', async () => {
    const res = await server.req('POST', '/payments/confirm', {}, clientCookie);
    assert.equal(res.status, 400);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await server.req('POST', '/payments/confirm', { sessionId: 'cs_test_anything' }, null);
    assert.equal(res.status, 401);
  });

  it('a client cannot confirm another order it does not own', async () => {
    const other = await createTestUser(prisma, { prefix: `${PREFIX}-other`, role: 'CLIENT', withCustomer: true });
    try {
      const sessionId = `cs_test_${PREFIX}_007`;
      await prisma.pendingCheckout.create({
        data: {
          userId: other.id,
          stripeSessionId: sessionId,
          cartJson: JSON.stringify([{ productId: product.id, quantity: 1 }]),
          checkoutJson: JSON.stringify(checkoutData),
          observations: null,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
      await finalizeCheckoutSession(fakeStripeSession(sessionId));

      const res = await server.req('POST', '/payments/confirm', { sessionId }, clientCookie);
      assert.equal(res.status, 404);
    } finally {
      await cleanupTestUsers(prisma, [`${PREFIX}-other`]);
    }
  });
});
