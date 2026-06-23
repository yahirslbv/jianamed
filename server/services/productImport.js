import { randomUUID } from 'node:crypto';
import { HEALTH_FRACTIONS, PRODUCT_TYPES, isAllowed } from '../constants.js';
import { parseMoneyInput } from '../utils/money.js';

export const PRODUCT_IMPORT_HEADERS = ['sku', 'commercialName', 'genericName', 'activeIngredient', 'laboratory', 'category', 'pharmaceuticalForm', 'concentration', 'presentation', 'sanitaryRegistration', 'healthFraction', 'requiresPrescription', 'requiresRetainedPrescription', 'isControlled', 'productType', 'price', 'stock', 'imageUrl', 'description', 'isActive'];
const previewStore = new Map();
const importModes = new Set(['create_only', 'update_existing', 'create_or_update']);

function normalized(value) { return String(value || '').trim().toLowerCase(); }
function slugify(value) { return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function booleanValue(value) {
  const normalizedValue = normalized(value);
  if (['true', 'si', 'sí', 's', '1'].includes(normalizedValue)) return true;
  if (['false', 'no', 'n', '0', ''].includes(normalizedValue)) return false;
  return null;
}

export function parseCsv(buffer) {
  const input = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]; const next = input[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return { error: 'El CSV no contiene filas.' };
  const headers = rows.shift().map((header) => header.trim());
  const missing = PRODUCT_IMPORT_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) return { error: `Faltan columnas requeridas: ${missing.join(', ')}.` };
  return {
    rows: rows.map((values, index) => ({
      line: index + 2,
      values: Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ''])),
    })),
  };
}

function validateRecord(values, context, options) {
  const errors = [];
  const required = ['sku', 'commercialName', 'genericName', 'activeIngredient', 'laboratory', 'category', 'pharmaceuticalForm', 'concentration', 'presentation', 'productType', 'price', 'stock'];
  required.forEach((field) => { if (!String(values[field] || '').trim()) errors.push(`${field} es obligatorio`); });
  const priceCents = parseMoneyInput(values.price);
  if (priceCents === null || priceCents < 0) errors.push('price debe ser un monto válido no negativo');
  const stock = Number.parseInt(values.stock, 10);
  if (!Number.isInteger(stock) || stock < 0) errors.push('stock debe ser un entero mayor o igual a 0');
  const productType = values.productType.trim();
  if (!isAllowed(productType, PRODUCT_TYPES)) errors.push('productType no es válido');
  const healthFraction = values.healthFraction.trim() || 'NOT_APPLICABLE';
  if (!isAllowed(healthFraction, HEALTH_FRACTIONS)) errors.push('healthFraction no es válida');
  const flags = ['requiresPrescription', 'requiresRetainedPrescription', 'isControlled', 'isActive'];
  const parsedFlags = Object.fromEntries(flags.map((field) => [field, booleanValue(values[field])]))
  flags.forEach((field) => { if (parsedFlags[field] === null) errors.push(`${field} debe ser true/false, sí/no o 1/0`); });
  const laboratoryKey = normalized(values.laboratory); const categoryKey = normalized(values.category); const sku = values.sku.trim();
  const existing = context.products.get(sku);
  if (existing && options.mode === 'create_only') errors.push('SKU existente: el modo solo permite crear');
  if (!existing && options.mode === 'update_existing') errors.push('SKU inexistente: el modo solo permite actualizar');
  if (!context.laboratories.has(laboratoryKey) && !options.createLaboratories) errors.push('Laboratorio inexistente');
  if (!context.categories.has(categoryKey) && !options.createCategories) errors.push('Categoría inexistente');
  if (values.imageUrl && !values.imageUrl.startsWith('/api/uploads/products/')) errors.push('imageUrl solo puede ser una ruta protegida local');
  return { errors, sku, existing, laboratoryKey, categoryKey, data: { sku, commercialName: values.commercialName.trim(), genericName: values.genericName.trim(), activeIngredient: values.activeIngredient.trim(), pharmaceuticalForm: values.pharmaceuticalForm.trim(), concentration: values.concentration.trim(), presentation: values.presentation.trim(), sanitaryRegistration: values.sanitaryRegistration.trim() || null, healthFraction, productType, priceCents, stock, imageUrl: values.imageUrl.trim() || null, description: values.description.trim() || null, ...parsedFlags } };
}

export async function createPreview(prisma, buffer, userId, rawOptions = {}) {
  const parsed = parseCsv(buffer); if (parsed.error) return parsed;
  const options = { mode: importModes.has(rawOptions.mode) ? rawOptions.mode : 'create_or_update', createLaboratories: Boolean(rawOptions.createLaboratories), createCategories: Boolean(rawOptions.createCategories) };
  const [products, laboratories, categories] = await Promise.all([prisma.product.findMany(), prisma.laboratory.findMany(), prisma.category.findMany()]);
  const context = { products: new Map(products.map((item) => [item.sku, item])), laboratories: new Map(laboratories.map((item) => [normalized(item.name), item])), categories: new Map(categories.map((item) => [normalized(item.name), item])) };
  const seenSkus = new Set(); const rows = parsed.rows.map(({ line, values }) => {
    const record = validateRecord(values, context, options);
    if (seenSkus.has(record.sku)) record.errors.push('SKU duplicado dentro del archivo');
    seenSkus.add(record.sku); return { line, values, ...record };
  });
  const valid = rows.filter((row) => !row.errors.length);
  const importId = randomUUID();
  previewStore.set(importId, { createdAt: Date.now(), userId, options, rows });
  const missingLaboratories = [...new Set(valid.filter((row) => !context.laboratories.has(row.laboratoryKey)).map((row) => row.values.laboratory.trim()))];
  const missingCategories = [...new Set(valid.filter((row) => !context.categories.has(row.categoryKey)).map((row) => row.values.category.trim()))];
  return { importId, totalRows: rows.length, validRows: valid.length, invalidRows: rows.length - valid.length, creates: valid.filter((row) => !row.existing).length, updates: valid.filter((row) => row.existing).length, missingLaboratories, missingCategories, rows: rows.map((row) => ({ line: row.line, sku: row.sku, action: row.existing ? 'update' : 'create', errors: row.errors })) };
}

export async function confirmPreview(prisma, importId, userId) {
  const preview = previewStore.get(importId);
  if (!preview || preview.userId !== userId || Date.now() - preview.createdAt > 15 * 60 * 1000) throw new Error('La vista previa expiró. Sube el archivo nuevamente.');
  const validRows = preview.rows.filter((row) => !row.errors.length);
  const result = await prisma.$transaction(async (tx) => {
    const labs = new Map((await tx.laboratory.findMany()).map((item) => [normalized(item.name), item]));
    const categories = new Map((await tx.category.findMany()).map((item) => [normalized(item.name), item]));
    let created = 0; let updated = 0;
    for (const row of validRows) {
      let laboratory = labs.get(row.laboratoryKey);
      if (!laboratory) { laboratory = await tx.laboratory.create({ data: { name: row.values.laboratory.trim(), slug: slugify(row.values.laboratory), isActive: true } }); labs.set(row.laboratoryKey, laboratory); }
      let category = categories.get(row.categoryKey);
      if (!category) { category = await tx.category.create({ data: { name: row.values.category.trim(), slug: slugify(row.values.category), isActive: true } }); categories.set(row.categoryKey, category); }
      const data = { ...row.data, laboratoryId: laboratory.id, categoryId: category.id };
      const existing = await tx.product.findUnique({ where: { sku: row.sku } });
      if (existing) { await tx.product.update({ where: { id: existing.id }, data }); updated += 1; } else { await tx.product.create({ data }); created += 1; }
    }
    return { created, updated, skipped: preview.rows.length - validRows.length, errors: preview.rows.filter((row) => row.errors.length).map((row) => ({ line: row.line, sku: row.sku, errors: row.errors })) };
  });
  previewStore.delete(importId); return result;
}
