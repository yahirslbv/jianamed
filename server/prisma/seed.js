import '../env.js';
import bcrypt from 'bcrypt';
import prisma from '../db.js';

const laboratories = [
  {
    name: 'NovaMed',
    slug: 'novamed',
    description: 'Laboratorio ficticio de productos OTC y genéricos para demo.',
  },
  {
    name: 'Laboratorios Andar',
    slug: 'laboratorios-andar',
    description: 'Laboratorio ficticio de líneas RX para demo.',
  },
  {
    name: 'CuraMed',
    slug: 'curamed',
    description: 'Proveedor ficticio de material de curación para demo.',
  },
];

const categories = [
  { name: 'Genéricos', slug: 'genericos', description: 'Medicamentos genéricos para catálogo.' },
  { name: 'OTC', slug: 'otc', description: 'Productos de libre consulta.' },
  { name: 'RX', slug: 'rx', description: 'Productos sujetos a receta médica.' },
  {
    name: 'Material de curación',
    slug: 'material-curacion',
    description: 'Insumos de curación y apoyo institucional.',
  },
  {
    name: 'Vitaminas y suplementos',
    slug: 'vitaminas-suplementos',
    description: 'Complementos de catálogo.',
  },
];

const products = [
  {
    sku: 'TTP-ANL-500-24',
    commercialName: 'Analgesin Plus',
    genericName: 'Paracetamol',
    activeIngredient: 'Paracetamol',
    laboratorySlug: 'novamed',
    categorySlug: 'genericos',
    pharmaceuticalForm: 'Tableta',
    concentration: '500 mg',
    presentation: 'Caja con 24 tabletas',
    sanitaryRegistration: 'DEMO-ANL-001',
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'GENERIC',
    price: 58,
    stock: 120,
    description: 'Producto ficticio para consulta de catálogo B2B.',
  },
  {
    sku: 'TTP-LOR-010-10',
    commercialName: 'Loramed Control',
    genericName: 'Loratadina',
    activeIngredient: 'Loratadina',
    laboratorySlug: 'novamed',
    categorySlug: 'otc',
    pharmaceuticalForm: 'Tableta',
    concentration: '10 mg',
    presentation: 'Caja con 10 tabletas',
    sanitaryRegistration: 'DEMO-LOR-002',
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'OTC',
    price: 74,
    stock: 84,
    description: 'Producto OTC ficticio para consulta de catálogo B2B.',
  },
  {
    sku: 'TTP-GLI-XR750-30',
    commercialName: 'Glicomed XR',
    genericName: 'Metformina',
    activeIngredient: 'Metformina',
    laboratorySlug: 'laboratorios-andar',
    categorySlug: 'rx',
    pharmaceuticalForm: 'Tableta de liberación prolongada',
    concentration: '750 mg',
    presentation: 'Caja con 30 tabletas',
    sanitaryRegistration: 'DEMO-GLI-003',
    healthFraction: 'FRACTION_IV',
    requiresPrescription: true,
    productType: 'RX',
    price: 168,
    stock: 36,
    description: 'Producto RX ficticio para catálogo autorizado.',
  },
  {
    sku: 'TTP-CAR-050-30',
    commercialName: 'Cardiotensil',
    genericName: 'Losartán potásico',
    activeIngredient: 'Losartán potásico',
    laboratorySlug: 'laboratorios-andar',
    categorySlug: 'rx',
    pharmaceuticalForm: 'Tableta',
    concentration: '50 mg',
    presentation: 'Caja con 30 tabletas',
    sanitaryRegistration: 'DEMO-CAR-004',
    healthFraction: 'FRACTION_IV',
    requiresPrescription: true,
    productType: 'RX',
    price: 132,
    stock: 48,
    description: 'Producto RX ficticio para catálogo autorizado.',
  },
  {
    sku: 'TTP-AMX-875-14',
    commercialName: 'Amoximed Duo',
    genericName: 'Amoxicilina con ácido clavulánico',
    activeIngredient: 'Amoxicilina / ácido clavulánico',
    laboratorySlug: 'laboratorios-andar',
    categorySlug: 'rx',
    pharmaceuticalForm: 'Tableta recubierta',
    concentration: '875 mg / 125 mg',
    presentation: 'Caja con 14 tabletas',
    sanitaryRegistration: 'DEMO-AMX-005',
    healthFraction: 'FRACTION_IV',
    requiresPrescription: true,
    productType: 'RX',
    price: 244,
    stock: 20,
    description: 'Producto RX ficticio para catálogo autorizado.',
  },
  {
    sku: 'TTP-OMG-020-14',
    commercialName: 'Omeprazol Genex',
    genericName: 'Omeprazol',
    activeIngredient: 'Omeprazol',
    laboratorySlug: 'novamed',
    categorySlug: 'genericos',
    pharmaceuticalForm: 'Cápsula',
    concentration: '20 mg',
    presentation: 'Caja con 14 cápsulas',
    sanitaryRegistration: 'DEMO-OMG-006',
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'GENERIC',
    price: 49,
    stock: 210,
    description: 'Producto genérico ficticio para catálogo.',
  },
  {
    sku: 'TTP-SOV-500-SOL',
    commercialName: 'Suero Oral Vida',
    genericName: 'Solución oral con electrolitos',
    activeIngredient: 'Electrolitos orales',
    laboratorySlug: 'novamed',
    categorySlug: 'otc',
    pharmaceuticalForm: 'Solución oral',
    concentration: 'Fórmula balanceada',
    presentation: 'Botella de 500 ml',
    sanitaryRegistration: 'DEMO-SOV-007',
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'OTC',
    price: 36,
    stock: 160,
    description: 'Producto ficticio para consulta de catálogo B2B.',
  },
  {
    sku: 'TTP-GAS-10X10-25',
    commercialName: 'Gasas Estériles Pro',
    genericName: 'Gasa estéril',
    activeIngredient: 'No aplica',
    laboratorySlug: 'curamed',
    categorySlug: 'material-curacion',
    pharmaceuticalForm: 'Material estéril',
    concentration: '10 x 10 cm',
    presentation: 'Paquete con 25 piezas',
    sanitaryRegistration: null,
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'HEALING_MATERIAL',
    price: 64,
    stock: 260,
    description: 'Material ficticio de curación para catálogo B2B.',
  },
  {
    sku: 'TTP-VEN-10X5-RL',
    commercialName: 'Venda Flex',
    genericName: 'Venda elástica',
    activeIngredient: 'No aplica',
    laboratorySlug: 'curamed',
    categorySlug: 'material-curacion',
    pharmaceuticalForm: 'Venda elástica',
    concentration: '10 cm x 5 m',
    presentation: 'Rollo individual',
    sanitaryRegistration: null,
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'HEALING_MATERIAL',
    price: 42,
    stock: 145,
    description: 'Material ficticio de curación para catálogo B2B.',
  },
  {
    sku: 'TTP-VTC-1G-20',
    commercialName: 'Vita C Forte',
    genericName: 'Ácido ascórbico',
    activeIngredient: 'Ácido ascórbico',
    laboratorySlug: 'novamed',
    categorySlug: 'vitaminas-suplementos',
    pharmaceuticalForm: 'Tableta efervescente',
    concentration: '1 g',
    presentation: 'Tubo con 20 tabletas',
    sanitaryRegistration: 'DEMO-VTC-010',
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'SUPPLEMENT',
    price: 118,
    stock: 72,
    description: 'Suplemento ficticio para catálogo B2B.',
  },
  {
    sku: 'TTP-NAT-250-30',
    commercialName: 'Natura Relax',
    genericName: 'Extracto de valeriana',
    activeIngredient: 'Extracto de valeriana',
    laboratorySlug: 'novamed',
    categorySlug: 'vitaminas-suplementos',
    pharmaceuticalForm: 'Cápsula',
    concentration: '250 mg',
    presentation: 'Frasco con 30 cápsulas',
    sanitaryRegistration: 'DEMO-NAT-011',
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'NATURISM',
    price: 105,
    stock: 40,
    description: 'Producto natural ficticio para catálogo B2B.',
  },
  {
    sku: 'TTP-GEL-500-B2B',
    commercialName: 'Gel Antibacterial B2B',
    genericName: 'Alcohol etílico',
    activeIngredient: 'Alcohol etílico',
    laboratorySlug: 'curamed',
    categorySlug: 'material-curacion',
    pharmaceuticalForm: 'Gel tópico',
    concentration: '70 %',
    presentation: 'Botella de 500 ml',
    sanitaryRegistration: null,
    healthFraction: 'NOT_APPLICABLE',
    requiresPrescription: false,
    productType: 'MEDICAL_SUPPLY',
    price: 69,
    stock: 190,
    description: 'Insumo ficticio para catálogo B2B.',
  },
];

async function main() {
  const clientPasswordHash = await bcrypt.hash('demo123', 12);
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const client = await prisma.user.upsert({
    where: { email: 'cliente@demo.com' },
    update: { name: 'Cliente Demo', passwordHash: clientPasswordHash, role: 'client', isActive: true },
    create: {
      name: 'Cliente Demo',
      email: 'cliente@demo.com',
      passwordHash: clientPasswordHash,
      role: 'client',
    },
  });
  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { name: 'Admin Demo', passwordHash: adminPasswordHash, role: 'admin', isActive: true },
    create: {
      name: 'Admin Demo',
      email: 'admin@demo.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
  });

  const customer = await prisma.customer.upsert({
    where: { userId: client.id },
    update: {
      businessName: 'Farmacia Demo del Norte',
      contactName: 'Cliente Demo',
      phone: '+52 664 123 4567',
      address: 'Av. Constitución 1240, Zona Centro',
      city: 'Tijuana',
      state: 'Baja California',
      postalCode: '22000',
      isAuthorized: true,
    },
    create: {
      userId: client.id,
      businessName: 'Farmacia Demo del Norte',
      commercialName: 'Farmacia Demo',
      rfc: 'FDM010101AAA',
      contactName: 'Cliente Demo',
      phone: '+52 664 123 4567',
      address: 'Av. Constitución 1240, Zona Centro',
      city: 'Tijuana',
      state: 'Baja California',
      postalCode: '22000',
      sanitaryLicense: 'LIC-DEMO-001',
      isAuthorized: true,
    },
  });

  for (const laboratory of laboratories) {
    await prisma.laboratory.upsert({
      where: { slug: laboratory.slug },
      update: laboratory,
      create: laboratory,
    });
  }
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  const laboratoryRows = await prisma.laboratory.findMany();
  const categoryRows = await prisma.category.findMany();
  const laboratoryIds = new Map(laboratoryRows.map((laboratory) => [laboratory.slug, laboratory.id]));
  const categoryIds = new Map(categoryRows.map((category) => [category.slug, category.id]));

  for (const product of products) {
    const { laboratorySlug, categorySlug, ...productData } = product;
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        ...productData,
        laboratoryId: laboratoryIds.get(laboratorySlug),
        categoryId: categoryIds.get(categorySlug),
      },
      create: {
        ...productData,
        laboratoryId: laboratoryIds.get(laboratorySlug),
        categoryId: categoryIds.get(categorySlug),
      },
    });
  }

  const seededProducts = await prisma.product.findMany({
    where: { sku: { in: ['TTP-ANL-500-24', 'TTP-GAS-10X10-25', 'TTP-AMX-875-14'] } },
    include: { laboratory: true },
  });
  const productBySku = new Map(seededProducts.map((product) => [product.sku, product]));

  const analgesin = productBySku.get('TTP-ANL-500-24');
  const gasas = productBySku.get('TTP-GAS-10X10-25');
  const amoximed = productBySku.get('TTP-AMX-875-14');

  await prisma.inventoryLot.upsert({
    where: { productId_lotNumber: { productId: analgesin.id, lotNumber: 'DEMO-ANL-01' } },
    update: { quantity: 120, expirationDate: new Date('2028-12-31'), warehouseLocation: 'A-01-01' },
    create: {
      productId: analgesin.id,
      lotNumber: 'DEMO-ANL-01',
      expirationDate: new Date('2028-12-31'),
      quantity: 120,
      warehouseLocation: 'A-01-01',
    },
  });

  const seedOrders = [
    {
      folio: 'PED-2026-0001',
      status: 'PENDING_REVIEW',
      observations: 'Pedido de ejemplo pendiente de validación comercial.',
      items: [{ product: analgesin, quantity: 2 }],
    },
    {
      folio: 'PED-2026-0002',
      status: 'IN_REVIEW',
      observations: 'Pedido de ejemplo en revisión por un agente de ventas.',
      items: [
        { product: gasas, quantity: 3 },
        { product: amoximed, quantity: 1 },
      ],
    },
  ];

  for (const seedOrder of seedOrders) {
    const subtotal = seedOrder.items.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    );
    await prisma.order.upsert({
      where: { folio: seedOrder.folio },
      update: {},
      create: {
        folio: seedOrder.folio,
        userId: client.id,
        customerId: customer.id,
        status: seedOrder.status,
        subtotal,
        total: subtotal,
        observations: seedOrder.observations,
        items: {
          create: seedOrder.items.map(({ product, quantity }) => ({
            productId: product.id,
            sku: product.sku,
            productName: product.commercialName,
            laboratoryName: product.laboratory.name,
            presentation: product.presentation,
            quantity,
            unitPrice: product.price,
            subtotal: product.price * quantity,
          })),
        },
      },
    });
  }

  console.log('Seed completado: 2 usuarios, 3 laboratorios, 5 categorías, 12 productos y 2 pedidos.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
