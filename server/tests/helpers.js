import { createServer } from 'node:http';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 4; // fast for tests

export const TEST_ORIGIN = 'http://localhost:5173';
export const TEST_PASSWORD = 'TestPass1234!';

export async function startTestServer() {
  const { createApp } = await import('../app.js');
  const { default: prisma } = await import('../db.js');

  const app = createApp();
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/api`;

  async function req(method, path, body, cookie) {
    const headers = { 'Content-Type': 'application/json', Origin: TEST_ORIGIN };
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return {
      status: res.status,
      data: await res.json().catch(() => ({})),
      cookie: res.headers.get('set-cookie')?.split(';')[0] ?? null,
    };
  }

  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  }

  return { req, stop, prisma, base };
}

export async function createTestUser(prisma, { prefix, role = 'CLIENT', withCustomer = false }) {
  const email = `${prefix}@test.invalid`;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

  const data = {
    name: `Test ${prefix}`,
    email,
    passwordHash,
    role: role.toUpperCase(),
    isActive: true,
  };

  if (withCustomer) {
    data.customer = {
      create: {
        businessName: `${prefix} Farmacia SA`,
        contactName: `Contacto ${prefix}`,
        phone: '6641234567',
        address: 'Av. Revolución 123',
        city: 'Tijuana',
        state: 'Baja California',
        postalCode: '22000',
        rfc: 'TFP990101ABC',
        isAuthorized: true,
      },
    };
  }

  return prisma.user.create({ data, include: { customer: true } });
}

export async function createTestLaboratory(prisma, name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return prisma.laboratory.create({ data: { name, slug, isActive: true } });
}

export async function createTestCategory(prisma, name) {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return prisma.category.upsert({
    where: { slug },
    create: { name, slug, isActive: true },
    update: {},
  });
}

export async function createTestProduct(prisma, { laboratoryId, categoryId, sku, commercialName = 'Producto Test', priceCents = 5000, stock = 100 }) {
  return prisma.product.create({
    data: {
      sku,
      commercialName,
      genericName: 'Genérico Test',
      activeIngredient: 'Principio Activo Test',
      pharmaceuticalForm: 'Tableta',
      concentration: '100 mg',
      presentation: 'Caja con 30 tabletas',
      productType: 'MEDICAMENTO',
      priceCents,
      stock,
      isActive: true,
      laboratoryId,
      categoryId,
    },
  });
}

export async function cleanupTestUsers(prisma, prefix) {
  const emails = Array.isArray(prefix)
    ? prefix.map((p) => `${p}@test.invalid`)
    : [`${prefix}@test.invalid`];

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) continue;
    // Delete in dependency order
    await prisma.orderItem.deleteMany({ where: { order: { userId: user.id } } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.customer.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { email } });
  }
}

export async function cleanupTestProducts(prisma, skus) {
  const skuList = Array.isArray(skus) ? skus : [skus];
  for (const sku of skuList) {
    await prisma.orderItem.deleteMany({ where: { product: { sku } } });
    await prisma.product.deleteMany({ where: { sku } });
  }
}

export async function cleanupTestLaboratories(prisma, names) {
  const nameList = Array.isArray(names) ? names : [names];
  for (const name of nameList) {
    const lab = await prisma.laboratory.findFirst({ where: { name } });
    if (!lab) continue;
    const products = await prisma.product.findMany({ where: { laboratoryId: lab.id }, select: { id: true } });
    for (const prod of products) {
      await prisma.orderItem.deleteMany({ where: { productId: prod.id } });
    }
    await prisma.product.deleteMany({ where: { laboratoryId: lab.id } });
    await prisma.laboratory.delete({ where: { id: lab.id } });
  }
}

export async function cleanupTestCategories(prisma, names) {
  const nameList = Array.isArray(names) ? names : [names];
  for (const name of nameList) {
    await prisma.category.deleteMany({ where: { name } });
  }
}
