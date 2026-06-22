import PDFDocument from 'pdfkit';
import prisma from '../db.js';
import { getActiveOffers, getOfferApplication, offerInclude } from './offers.js';

export const REPORT_TYPES = ['orders', 'products', 'inventory', 'offers', 'customers'];

const reportDefinitions = {
  orders: {
    title: 'Reporte de pedidos',
    columns: [
      ['folio', 'Folio'], ['createdAt', 'Fecha'], ['clientName', 'Cliente'], ['clientEmail', 'Correo'],
      ['status', 'Estado'], ['subtotal', 'Subtotal'], ['discountTotal', 'Descuento total'], ['total', 'Total'],
      ['observations', 'Observaciones'], ['deliveryAddress', 'Direccion de entrega'], ['responsibleName', 'Responsable'], ['updatedAt', 'Actualizado'],
    ],
  },
  products: {
    title: 'Reporte de productos',
    columns: [
      ['sku', 'SKU'], ['commercialName', 'Nombre comercial'], ['genericName', 'Denominacion generica'], ['activeIngredient', 'Principio activo'],
      ['laboratory', 'Laboratorio'], ['category', 'Categoria'], ['productType', 'Tipo'], ['healthFraction', 'Fraccion sanitaria'],
      ['requiresPrescription', 'Requiere receta'], ['requiresRetainedPrescription', 'Receta retenida'], ['isControlled', 'Controlado'], ['sanitaryRegistration', 'Registro sanitario'],
      ['price', 'Precio'], ['stock', 'Stock'], ['isActive', 'Activo'], ['hasImage', 'Tiene imagen'], ['hasActiveOffer', 'Tiene oferta'], ['createdAt', 'Creado'], ['updatedAt', 'Actualizado'],
    ],
  },
  inventory: {
    title: 'Reporte de inventario',
    columns: [
      ['sku', 'SKU'], ['product', 'Producto'], ['laboratory', 'Laboratorio'], ['category', 'Categoria'], ['stock', 'Stock actual'],
      ['stockStatus', 'Estado de stock'], ['price', 'Precio'], ['inventoryValue', 'Valor estimado'], ['isActive', 'Activo'],
    ],
  },
  offers: {
    title: 'Reporte de ofertas',
    columns: [
      ['title', 'Titulo'], ['discountType', 'Tipo de descuento'], ['discountValue', 'Valor'], ['product', 'Producto'],
      ['laboratory', 'Laboratorio'], ['category', 'Categoria'], ['productType', 'Tipo de producto'], ['startsAt', 'Inicio'], ['endsAt', 'Fin'], ['isActive', 'Activa'], ['validity', 'Vigencia'],
    ],
  },
  customers: {
    title: 'Reporte de clientes',
    columns: [
      ['name', 'Nombre'], ['email', 'Correo'], ['role', 'Rol'], ['businessName', 'Razon social'], ['commercialName', 'Nombre comercial'],
      ['rfc', 'RFC'], ['phone', 'Telefono'], ['city', 'Ciudad'], ['state', 'Estado'], ['sanitaryLicense', 'Licencia sanitaria'], ['isAuthorized', 'Autorizado'], ['isActive', 'Activo'], ['createdAt', 'Creado'],
    ],
  },
};

function parseBoolean(value) {
  if (value === undefined || value === '') return null;
  return value === 'true' || value === true;
}

function parseNumber(value) {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesText(value, filterValue) {
  return !filterValue || String(value || '').toLowerCase().includes(String(filterValue).toLowerCase());
}

function matchesBoolean(actual, filterValue) {
  const parsed = parseBoolean(filterValue);
  return parsed === null || Boolean(actual) === parsed;
}

function matchesRange(value, minValue, maxValue) {
  const min = parseNumber(minValue);
  const max = parseNumber(maxValue);
  return (min === null || value >= min) && (max === null || value <= max);
}

function matchesDateRange(value, startDate, endDate) {
  const timestamp = new Date(value).getTime();
  const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
  return (start === null || timestamp >= start) && (end === null || timestamp <= end);
}

function toYesNo(value) {
  return value ? 'Si' : 'No';
}

function toDate(value) {
  return value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '';
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function getAppliedFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== '' && value !== false),
  );
}

async function getOrderRows(filters) {
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      customer: true,
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders
    .filter((order) => {
      const clientName = order.clientName || order.customer?.businessName || order.user?.name;
      const clientEmail = order.clientEmail || order.user?.email;
      const quickStatus = filters.cancelled === 'true' ? 'CANCELLED' : filters.pending === 'true' ? 'PENDING_REVIEW' : filters.approved === 'true' ? 'APPROVED' : '';
      return (
        matchesDateRange(order.createdAt, filters.dateFrom, filters.dateTo) &&
        (!filters.status || order.status === filters.status) &&
        (!quickStatus || order.status === quickStatus) &&
        matchesText(clientName, filters.client) &&
        matchesText(clientEmail, filters.email) &&
        matchesText(order.folio, filters.folio) &&
        matchesRange(order.total, filters.minAmount, filters.maxAmount) &&
        matchesBoolean(order.discountTotal > 0, filters.hasDiscount)
      );
    })
    .map((order) => ({
      folio: order.folio,
      createdAt: toDate(order.createdAt),
      clientName: order.clientName || order.customer?.businessName || order.user?.name || '',
      clientEmail: order.clientEmail || order.user?.email || '',
      status: order.status,
      subtotal: toMoney(order.subtotal),
      discountTotal: toMoney(order.discountTotal),
      total: toMoney(order.total),
      observations: order.observations || '',
      deliveryAddress: [order.deliveryAddress, order.deliveryCity, order.deliveryState, order.deliveryPostalCode].filter(Boolean).join(', '),
      responsibleName: order.responsibleName || '',
      updatedAt: toDate(order.updatedAt),
    }));
}

async function getProductRecords() {
  const [products, offers] = await Promise.all([
    prisma.product.findMany({ include: { laboratory: true, category: true }, orderBy: { commercialName: 'asc' } }),
    getActiveOffers(prisma),
  ]);

  return products.map((product) => ({ product, offerApplication: getOfferApplication(product, offers) }));
}

function filterProductRecords(records, filters) {
  return records.filter(({ product, offerApplication }) => {
    const hasImage = Boolean(product.imageUrl);
    const lowStock = product.stock > 0 && product.stock <= 30;
    return (
      (!filters.laboratoryId || product.laboratoryId === filters.laboratoryId) &&
      (!filters.categoryId || product.categoryId === filters.categoryId) &&
      (!filters.productType || product.productType === filters.productType) &&
      (!filters.healthFraction || product.healthFraction === filters.healthFraction) &&
      matchesBoolean(product.isActive, filters.isActive) &&
      matchesBoolean(hasImage, filters.hasImage) &&
      matchesBoolean(Boolean(offerApplication), filters.hasOffer) &&
      matchesBoolean(lowStock, filters.lowStock) &&
      matchesBoolean(product.stock === 0, filters.outOfStock) &&
      matchesRange(product.price, filters.minPrice, filters.maxPrice) &&
      matchesBoolean(product.requiresPrescription, filters.requiresPrescription) &&
      matchesBoolean(product.requiresRetainedPrescription, filters.requiresRetainedPrescription) &&
      matchesBoolean(product.isControlled, filters.isControlled) &&
      (parseNumber(filters.stockGreaterThan) === null || product.stock > parseNumber(filters.stockGreaterThan)) &&
      (parseNumber(filters.stockLessThan) === null || product.stock < parseNumber(filters.stockLessThan))
    );
  });
}

async function getProductRows(filters) {
  const records = filterProductRecords(await getProductRecords(), filters);
  return records.map(({ product, offerApplication }) => ({
    sku: product.sku,
    commercialName: product.commercialName,
    genericName: product.genericName,
    activeIngredient: product.activeIngredient,
    laboratory: product.laboratory.name,
    category: product.category.name,
    productType: product.productType,
    healthFraction: product.healthFraction,
    requiresPrescription: toYesNo(product.requiresPrescription),
    requiresRetainedPrescription: toYesNo(product.requiresRetainedPrescription),
    isControlled: toYesNo(product.isControlled),
    sanitaryRegistration: product.sanitaryRegistration || '',
    price: toMoney(product.price),
    stock: product.stock,
    isActive: toYesNo(product.isActive),
    hasImage: toYesNo(Boolean(product.imageUrl)),
    hasActiveOffer: toYesNo(Boolean(offerApplication)),
    createdAt: toDate(product.createdAt),
    updatedAt: toDate(product.updatedAt),
  }));
}

async function getInventoryRows(filters) {
  const records = filterProductRecords(await getProductRecords(), filters);
  return records.map(({ product }) => ({
    sku: product.sku,
    product: product.commercialName,
    laboratory: product.laboratory.name,
    category: product.category.name,
    stock: product.stock,
    stockStatus: product.stock === 0 ? 'Sin stock' : product.stock <= 30 ? 'Stock bajo' : 'Disponible',
    price: toMoney(product.price),
    inventoryValue: toMoney(product.price * product.stock),
    isActive: toYesNo(product.isActive),
  }));
}

async function getOfferRows(filters) {
  const offers = await prisma.offer.findMany({ include: offerInclude, orderBy: { createdAt: 'desc' } });
  const now = new Date();
  return offers
    .filter((offer) => {
      const validity = offer.endsAt < now ? 'EXPIRED' : offer.startsAt > now ? 'SCHEDULED' : 'CURRENT';
      return (
        matchesBoolean(offer.isActive, filters.isActive) &&
        (!filters.validity || validity === filters.validity) &&
        (!filters.productId || offer.productId === filters.productId) &&
        (!filters.laboratoryId || offer.laboratoryId === filters.laboratoryId) &&
        (!filters.categoryId || offer.categoryId === filters.categoryId) &&
        (!filters.discountType || offer.discountType === filters.discountType) &&
        matchesDateRange(offer.startsAt, filters.dateFrom, filters.dateTo)
      );
    })
    .map((offer) => ({
      title: offer.title,
      discountType: offer.discountType,
      discountValue: toMoney(offer.discountValue),
      product: offer.product?.commercialName || '',
      laboratory: offer.laboratory?.name || '',
      category: offer.category?.name || '',
      productType: offer.productType || '',
      startsAt: toDate(offer.startsAt),
      endsAt: toDate(offer.endsAt),
      isActive: toYesNo(offer.isActive),
      validity: offer.endsAt < now ? 'Expirada' : offer.startsAt > now ? 'Programada' : 'Vigente',
    }));
}

async function getCustomerRows(filters) {
  const users = await prisma.user.findMany({
    where: { role: 'client' },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  });

  return users
    .filter((user) => {
      const customer = user.customer;
      return (
        matchesText(customer?.state, filters.state) &&
        matchesText(customer?.city, filters.city) &&
        matchesBoolean(customer?.isAuthorized, filters.isAuthorized) &&
        matchesBoolean(Boolean(customer?.sanitaryLicense), filters.hasSanitaryLicense) &&
        matchesBoolean(user.isActive, filters.isActive)
      );
    })
    .map((user) => {
      const customer = user.customer;
      return {
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: customer?.businessName || '',
        commercialName: customer?.commercialName || '',
        rfc: customer?.rfc || '',
        phone: customer?.phone || '',
        city: customer?.city || '',
        state: customer?.state || '',
        sanitaryLicense: customer?.sanitaryLicense || '',
        isAuthorized: toYesNo(customer?.isAuthorized),
        isActive: toYesNo(user.isActive),
        createdAt: toDate(user.createdAt),
      };
    });
}

export async function getReport(type, filters = {}) {
  if (!REPORT_TYPES.includes(type)) {
    throw new Error('Tipo de reporte no valido.');
  }

  const rows = await ({
    orders: getOrderRows,
    products: getProductRows,
    inventory: getInventoryRows,
    offers: getOfferRows,
    customers: getCustomerRows,
  }[type](filters));

  return {
    type,
    title: reportDefinitions[type].title,
    columns: reportDefinitions[type].columns.map(([key, label]) => ({ key, label })),
    rows,
    filters: getAppliedFilters(filters),
  };
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createCsv(report) {
  const lines = [
    report.columns.map((column) => escapeCsvValue(column.label)).join(','),
    ...report.rows.map((row) => report.columns.map((column) => escapeCsvValue(row[column.key])).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}`;
}

function truncate(value, length) {
  const text = String(value ?? '');
  return text.length > length ? `${text.slice(0, Math.max(0, length - 1))}...` : text;
}

export function writePdf(res, report, adminName) {
  const landscape = report.columns.length > 7;
  const document = new PDFDocument({ size: 'LETTER', layout: landscape ? 'landscape' : 'portrait', margin: 28 });
  const pageWidth = landscape ? 792 : 612;
  const contentWidth = pageWidth - 56;
  const columnWidth = contentWidth / report.columns.length;
  const rowHeight = 20;
  const maxCellLength = report.columns.length > 9 ? 15 : 24;

  document.pipe(res);
  document.fillColor('#283890').fontSize(16).text('Tic Toc Pharma');
  document.fillColor('#1F2937').fontSize(12).text(report.title);
  document.fillColor('#4B5563').fontSize(8).text(`Generado: ${new Date().toLocaleString('es-MX')}  |  Usuario: ${adminName}`);
  const filterText = Object.keys(report.filters).length
    ? Object.entries(report.filters).map(([key, value]) => `${key}: ${value}`).join(' | ')
    : 'Sin filtros aplicados';
  document.text(`Filtros: ${truncate(filterText, 220)}`).moveDown(1);

  const drawHeader = () => {
    let x = 28;
    const y = document.y;
    document.fillColor('#283890').fontSize(6.2);
    report.columns.forEach((column) => {
      document.text(truncate(column.label, maxCellLength), x, y, { width: columnWidth - 4, height: rowHeight });
      x += columnWidth;
    });
    document.moveDown(1.3);
  };

  const ensureSpace = () => {
    if (document.y + rowHeight > (landscape ? 564 : 744)) {
      document.addPage();
      drawHeader();
    }
  };

  drawHeader();
  document.fillColor('#1F2937').fontSize(6.2);
  report.rows.forEach((row) => {
    ensureSpace();
    let x = 28;
    const y = document.y;
    report.columns.forEach((column) => {
      document.text(truncate(row[column.key], maxCellLength), x, y, { width: columnWidth - 4, height: rowHeight });
      x += columnWidth;
    });
    document.moveDown(1.35);
  });

  document.moveDown(1).fontSize(8).fillColor('#4B5563').text(`Total de registros: ${report.rows.length}`);
  document.end();
}
