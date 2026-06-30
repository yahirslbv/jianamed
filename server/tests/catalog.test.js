import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  startTestServer, createTestUser, createTestLaboratory, createTestCategory, createTestProduct,
  cleanupTestUsers, cleanupTestLaboratories, cleanupTestCategories, TEST_PASSWORD,
} from './helpers.js';

const PREFIX = 'cat-t';
const LAB_A = `${PREFIX} Lab Alfa`;
const LAB_B = `${PREFIX} Lab Beta`;
const CAT = `${PREFIX} Categoría`;
const SKU_A = `${PREFIX}-SKU-A`;
const SKU_B = `${PREFIX}-SKU-B`;
const SKU_C = `${PREFIX}-SKU-C`;

let server, prisma, clientCookie, labA, labB, cat;

before(async () => {
  const s = await startTestServer();
  server = s;
  prisma = s.prisma;

  await createTestUser(prisma, { prefix: `${PREFIX}-client`, role: 'CLIENT', withCustomer: true });

  labA = await createTestLaboratory(prisma, LAB_A);
  labB = await createTestLaboratory(prisma, LAB_B);
  cat = await createTestCategory(prisma, CAT);

  await createTestProduct(prisma, { laboratoryId: labA.id, categoryId: cat.id, sku: SKU_A, commercialName: 'Producto Alfa A', priceCents: 2000, stock: 50 });
  await createTestProduct(prisma, { laboratoryId: labA.id, categoryId: cat.id, sku: SKU_B, commercialName: 'Producto Alfa B', priceCents: 3500, stock: 0 });
  await createTestProduct(prisma, { laboratoryId: labB.id, categoryId: cat.id, sku: SKU_C, commercialName: 'Producto Beta C', priceCents: 1000, stock: 20 });

  const loginRes = await server.req('POST', '/auth/login', {
    email: `${PREFIX}-client@test.invalid`,
    password: TEST_PASSWORD,
  });
  clientCookie = loginRes.cookie;
});

after(async () => {
  await cleanupTestLaboratories(prisma, [LAB_A, LAB_B]);
  await cleanupTestCategories(prisma, [CAT]);
  await cleanupTestUsers(prisma, [`${PREFIX}-client`]);
  await server.stop();
});

describe('GET /products', () => {
  it('requires authentication', async () => {
    const res = await server.req('GET', '/products', undefined, null);
    assert.equal(res.status, 401);
  });

  it('returns products array with price field', async () => {
    const res = await server.req('GET', '/products', undefined, clientCookie);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data.products));
    const testProduct = res.data.products.find((p) => p.sku === SKU_A);
    assert.ok(testProduct, 'test product must be visible');
    assert.ok('price' in testProduct, 'price field must be present (serialized)');
    assert.ok(testProduct.commercialName || testProduct.name, 'product name must be present');
  });

  it('filters by laboratory', async () => {
    const res = await server.req('GET', `/products?laboratoryId=${labA.id}`, undefined, clientCookie);
    assert.equal(res.status, 200);
    const skus = res.data.products.map((p) => p.sku);
    assert.ok(skus.includes(SKU_A), 'Lab A product A must appear');
    assert.ok(!skus.includes(SKU_C), 'Lab B product must not appear when filtering Lab A');
  });

  it('filters by search term (commercialName)', async () => {
    const res = await server.req('GET', `/products?q=Alfa+A`, undefined, clientCookie);
    assert.equal(res.status, 200);
    const skus = res.data.products.map((p) => p.sku);
    assert.ok(skus.includes(SKU_A));
    // SKU_C is "Beta" and should not appear
    assert.ok(!skus.includes(SKU_C));
  });

  it('filters by search term (sku)', async () => {
    const res = await server.req('GET', `/products?q=${SKU_C}`, undefined, clientCookie);
    assert.equal(res.status, 200);
    const skus = res.data.products.map((p) => p.sku);
    assert.ok(skus.includes(SKU_C));
  });

  it('product data includes laboratory name', async () => {
    const res = await server.req('GET', `/products?search=${SKU_A}`, undefined, clientCookie);
    assert.equal(res.status, 200);
    const prod = res.data.products.find((p) => p.sku === SKU_A);
    assert.ok(prod?.laboratoryName || prod?.laboratory?.name, 'laboratory name must be in response');
  });
});

describe('GET /laboratories', () => {
  it('requires authentication', async () => {
    const res = await server.req('GET', '/laboratories', undefined, null);
    assert.equal(res.status, 401);
  });

  it('returns list with test laboratories', async () => {
    const res = await server.req('GET', '/laboratories', undefined, clientCookie);
    assert.equal(res.status, 200);
    const data = Array.isArray(res.data) ? res.data : res.data.laboratories;
    assert.ok(Array.isArray(data));
    const names = data.map((l) => l.name);
    assert.ok(names.includes(LAB_A));
    assert.ok(names.includes(LAB_B));
  });
});
