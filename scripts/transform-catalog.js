/**
 * Transforma los catálogos Excel (ya convertidos a JSON) al formato CSV
 * del importador de productos de Tic Toc Pharma.
 *
 * Uso:
 *   node scripts/transform-catalog.js
 *
 * Salida:
 *   catalogo-importacion.csv  — listo para subir desde Admin → Importar productos
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Rutas de entrada / salida ────────────────────────────────────────────────
const PATENTES_JSON = 'C:/Users/Victo/Downloads/patentes.json';
const GENERICOS_JSON = 'C:/Users/Victo/Downloads/genericos.json';
const OUTPUT_CSV    = path.join(__dirname, '..', 'catalogo-importacion.csv');

// ─── Cabeceras requeridas por el importador ───────────────────────────────────
const HEADERS = [
  'sku', 'commercialName', 'genericName', 'activeIngredient',
  'laboratory', 'category', 'pharmaceuticalForm', 'concentration',
  'presentation', 'sanitaryRegistration', 'healthFraction',
  'requiresPrescription', 'requiresRetainedPrescription', 'isControlled',
  'productType', 'price', 'stock', 'imageUrl', 'description', 'isActive',
];

// ─── Limpieza de precio ───────────────────────────────────────────────────────
function cleanPrice(raw) {
  const clean = String(raw || '').replace(/\$|\s|,/g, '');
  const num = parseFloat(clean);
  if (!clean || isNaN(num) || num < 0) return '0.00';
  return num.toFixed(2);
}

// ─── Forma farmacéutica ───────────────────────────────────────────────────────
function extractForm(articulo) {
  const a = ` ${articulo.toUpperCase()} `;

  if (/\bGTS\b/.test(a)) return 'Solución Gotas';
  if (/SOL\.?\s*OFT|\bOFT\b/.test(a)) return 'Solución Oftálmica';
  if (/SOL\.?\s*INY|INY\.?\s*SOL/.test(a)) return 'Solución Inyectable';
  if (/\bAMP\.?\b/.test(a) && !/SHAMPOO/.test(a)) return 'Ampolleta';
  if (/\bJBE\.?\b|\bJARABE\b/.test(a)) return 'Jarabe';
  if (/\bSUSP\.?\b|\bSUSPENSION\b/.test(a)) return 'Suspensión';
  if (/\bSPRAY\b/.test(a)) return 'Aerosol';
  if (/\bSHAMPOO\b/.test(a)) return 'Champú';
  if (/\bLOCION\b|\bLOCIÓN\b/.test(a)) return 'Loción';
  if (/\bJALEA\b/.test(a)) return 'Jalea';
  if (/\bUNGUENTO\b|\bUNGÜENTO\b/.test(a)) return 'Ungüento';
  if (/\bCMA\.?\b|\bCREMA\b/.test(a)) return 'Crema';
  if (/\bGEL\b/.test(a)) return 'Gel';
  if (/EFERV/.test(a)) return 'Tableta Efervescente';
  if (/\bTABS?\.?\b|\bTABLETAS?\b/.test(a)) return 'Tableta';
  if (/\bGRAG\.?\b/.test(a)) return 'Gragea';
  if (/\bCPR\.?\b|\bCOMPS?\.?\b/.test(a)) return 'Comprimido';
  if (/\bCAPS?\.?\b/.test(a)) return 'Cápsula';
  if (/\bSOL\.?\b|\bSOLUCION\b|\bSOLUCIÓN\b|\bFCO\b/.test(a)) return 'Solución';
  if (/\bPOLVO\b/.test(a)) return 'Polvo';
  if (/\bOVULO\b|\bÓVULO\b/.test(a)) return 'Óvulo';
  if (/\bSUPOS?\.?\b/.test(a)) return 'Supositorio';
  if (/\bACEITE\b/.test(a)) return 'Aceite';
  if (/\bPARCHE\b/.test(a)) return 'Parche';
  if (/\bSERUM\b|\bSÉRUM\b/.test(a)) return 'Sérum';

  return 'No especificado';
}

// ─── Concentración ────────────────────────────────────────────────────────────
function extractConcentration(formula) {
  const clean = formula.trim();
  // Busca la primera concentración: número + unidad
  const matches = [...clean.matchAll(/(\d+(?:\.\d+)?)\s*(mg|g|mcg|µg|%|UI|IU|mEq|ml|ML|MG|G|mcg)(?=\s|\/|$|[,;.])/gi)];
  if (!matches.length) return clean.length > 0 ? clean.slice(0, 60) : 'No especificada';

  // Combinaciones multi-ingrediente: toma hasta 3 concentraciones
  const doses = matches.slice(0, 3).map((m) => `${m[1]} ${m[2].toLowerCase()}`);
  return doses.join(' / ');
}

// ─── Principio activo ─────────────────────────────────────────────────────────
function extractActiveIngredient(formula) {
  // Limpia puntos sobrantes y espacios
  const clean = formula.replace(/\s{2,}/g, ' ').trim().replace(/\.$/, '');
  // Si tiene varios ingredientes (sep. por +), devuelve todo (es la combinación)
  if (clean.length > 120) return clean.slice(0, 120);
  return clean || 'No especificado';
}

// ─── Nombre genérico (sin dosis) ─────────────────────────────────────────────
function extractGenericName(formula) {
  // Extrae solo el/los nombres sin números ni unidades
  const clean = formula.replace(/\s{2,}/g, ' ').trim();
  // Intenta quitar dosis al final del primer ingrediente para obtener el nombre
  const nameOnly = clean.replace(/\s+\d+(?:\.\d+)?\s*(mg|g|mcg|%|UI|ml|MG|G)(?=\s|\/|$|[,.;]).*/gi, '').trim();
  if (nameOnly && nameOnly.length > 4) return nameOnly.slice(0, 120);
  return clean.slice(0, 120) || 'No especificado';
}

// ─── Presentación ─────────────────────────────────────────────────────────────
function extractPresentation(articulo) {
  const a = articulo.toUpperCase();

  // Intenta patrones: C/N TABS, FCO N ML, TUBO C/N G, etc.
  const countMatch = a.match(/C\/(\d+)\s*(TAB|CAP|AMP|COMP|CPR|GRAG|SUPO|CAPS?)?/);
  const volMatch = a.match(/(\d+(?:\.\d+)?)\s*(ML|L)\b/i);
  const weightMatch = a.match(/C?\/?\s*(\d+(?:\.\d+)?)\s*(G|GR|GRS|KG)\b/i);
  const isTube = /TUBO/.test(a);
  const isFco = /FCO|FRASCO|SOLUCION|SUSP|JBE|JARABE/.test(a);

  if (countMatch) {
    const n = countMatch[1];
    const unit = (countMatch[2] || 'pieza').toLowerCase();
    const unitMap = { tab: 'tableta', tabs: 'tableta', cap: 'cápsula', caps: 'cápsula', amp: 'ampolleta', comp: 'comprimido', cpr: 'comprimido', grag: 'gragea', supo: 'supositorio' };
    const label = unitMap[unit] || 'pieza';
    if (volMatch) return `Caja con ${n} ${label}s, ${volMatch[1]} ml`;
    return `Caja con ${n} ${label}s`;
  }
  if (isTube && weightMatch) return `Tubo ${weightMatch[1]} ${weightMatch[2].toLowerCase()}`;
  if (isFco && volMatch) return `Frasco ${volMatch[1]} ml`;
  if (volMatch) return `${volMatch[1]} ml`;
  if (weightMatch) return `${weightMatch[1]} ${weightMatch[2].toLowerCase()}`;

  // Última opción: usar la parte final del artículo
  const tail = articulo.trim().split(/\s+/).slice(-3).join(' ');
  return tail || 'Presentación no especificada';
}

// ─── Categoría terapéutica ────────────────────────────────────────────────────
function detectCategory(formula, articulo, sourceType) {
  const f = formula.toLowerCase();
  const a = articulo.toLowerCase();
  const text = `${f} ${a}`;

  if (/vitamina|omega|probiotico|probiótico|biotina|colageno|colágeno|suplemento|amino|calcio|zinc|hierro|folico|fólico|tocoferol/.test(text)) return 'Vitaminas y Suplementos';
  if (/aceite|aceite de|jaloma|aceite para/.test(text) && !/crema|gel/.test(text)) return 'Dermocosméticos';
  if (/shampoo|champu|champú|capilar|cabello/.test(text)) return 'Dermocosméticos';
  if (/aciclovir|amoxicilina|ampicilina|azitromicina|cefalexin|ceftriaxa|ciprofloxacin|claritromicin|clindamicin|doxiciclin|eritromicin|fluconazol|levofloxacin|metronidazol|nitrofurantoina|penicilina|sulfametoxazol|tetraciklin|trimetoprim|vancomicina|nifuroxazida|amox/.test(text)) return 'Antibióticos e Antiinfecciosos';
  if (/ibuprofeno|naproxeno|diclofenaco|paracetamol|metamizol|ketorolaco|aspirina|acido acetilsalicilico|meloxicam|piroxicam|celecoxib|nimesulida|aceclofenaco|indometacina/.test(text)) return 'Analgésicos y Antiinflamatorios';
  if (/amantadina|clorfenamina|loratadina|cetirizina|fexofenadina|desloratadina|difenhidramina|ebastina|antihistaminico|alerg/.test(text)) return 'Antialérgicos y Antihistamínicos';
  if (/salbutamol|ambroxol|teofilina|fluticasona|budesonida|salmeterol|ipratropio|bromhexina|acetilcisteina|dextrometorfano|clenbuterol|terbutalina|beclometason/.test(text)) return 'Respiratorio';
  if (/atenolol|enalapril|losartan|amlodipino|metoprolol|lisinopril|valsartan|furosemida|hidroclorotiazida|espironolactona|nifedipino|diltiazem|verapamilo|carvedilol|bisoprolol|irbesartan|telmisartan|candesartan|captopril|ramipril/.test(text)) return 'Cardiovascular';
  if (/omeprazol|ranitidina|famotidina|lansoprazol|pantoprazol|sucralfato|bismuto|metoclopramida|domperidona|esomeprazol|loperamida|diosmectita/.test(text)) return 'Gastrointestinal';
  if (/metformina|glibenclamida|glimepirida|insulina|sitagliptina|acarbosa|pioglitazona|empagliflozina|canagliflozina|dapagliflozina/.test(text)) return 'Endocrino y Metabolismo';
  if (/lorazepam|clonazepam|diazepam|alprazolam|sertralina|fluoxetina|paroxetina|escitalopram|venlafaxina|duloxetina|amitriptilina|quetiapina|risperidona|olanzapina|haloperidol|valproato|lamotrigina|carbamazepina|fenitoina|levetiracetam/.test(text)) return 'Neurológico y Psiquiátrico';
  if (/dexametasona|prednisona|prednisolona|hidrocortisona|betametasona|triamcinolona|metilprednisolon/.test(text)) return 'Corticoesteroides';
  if (/estradiol|progesterona|drospirenona|noretisterona|anticonceptivo|medroxiprogesterona|levonorgestrel|etonogestrel/.test(text)) return 'Ginecológico';
  if (/acido retinoico|retinoico|adapaleno|peróxido de benzoilo|clindamicina\s+gel|minoxidil|terbinafina|clotrimazol|miconazol|ketoconazol|hidroquinona|acniben/.test(text)) return 'Dermatológico';
  if (/oftalmico|oftálmico|sol gts|sol oft|cloranfenicol.*oft|timolol|dorzolamida|latanoprost|colirio|gotas.*ojos/.test(text)) return 'Oftalmológico';
  if (/tamsulosina|sildenafil|tadalafil|finasterida|dutasterida|vardenafil/.test(text)) return 'Urológico';
  if (/inyectable|ampolleta|suero|solucion\s+inyec|amikacina|gentamicina|ceftriaxona/.test(text)) return 'Soluciones e Inyectables';
  if (/abatelenguas|jeringa|guante|curación|venda|gasa|algodón|apósito|antiséptico|alcohol|agua inyectable/.test(text)) return 'Material de Curación e Insumos';

  // Fallback por origen
  return sourceType === 'PATENTE' ? 'Medicamentos de Patente' : 'Medicamentos Genéricos';
}

// ─── Tipo de producto ─────────────────────────────────────────────────────────
function detectProductType(formula, articulo, sourceType) {
  const text = `${formula} ${articulo}`.toLowerCase();

  if (/vitamina|omega|probiotico|biotina|colageno|suplemento|amino/.test(text)) return 'SUPPLEMENT';
  if (/shampoo|champu|champú|aceite para bebe|locion|perfum/.test(text)) return 'PERFUMERY';
  if (/abatelenguas|jeringa|guante|venda|gasa|algodón|apósito/.test(text)) return 'MEDICAL_SUPPLY';
  if (/material de curación|agua inyectable/.test(text)) return 'HEALING_MATERIAL';

  if (sourceType === 'PATENTE') return 'MEDICINE';
  return 'GENERIC';
}

// ─── Requiere receta ──────────────────────────────────────────────────────────
function detectPrescription(formula, articulo) {
  const text = `${formula} ${articulo}`.toLowerCase();
  // Antibióticos, psicotrópicos, controlados, biológicos generalmente requieren receta
  if (/amoxicilina|ampicilina|azitromicina|cefal|ceftri|cipro|clindamicin|eritromicin|levoflox|metronidazol|doxiciclin|penicilina|vancomicina/.test(text)) return 'true';
  if (/lorazepam|clonazepam|diazepam|alprazolam|sertralina|fluoxetina|paroxetina|escitalopram|quetiapina|risperidona|olanzapina|haloperidol|valproato|carbamazepina|fenitoina/.test(text)) return 'true';
  if (/insulina|metotrexato|warfarina|ciclosporina|tacrolimus/.test(text)) return 'true';
  if (/morfina|tramadol|codeina|oxicodona|fentanilo|buprenorfina/.test(text)) return 'true';
  return 'false';
}

// ─── Es controlado ────────────────────────────────────────────────────────────
function detectControlled(formula, articulo) {
  const text = `${formula} ${articulo}`.toLowerCase();
  if (/morfina|tramadol|codeina|oxicodona|fentanilo|buprenorfina|metadona|lorazepam|diazepam|clonazepam|alprazolam|metilfenidato/.test(text)) return 'true';
  return 'false';
}

// ─── Fracción de salud ────────────────────────────────────────────────────────
function detectFraction(formula, articulo) {
  const text = `${formula} ${articulo}`.toLowerCase();
  if (/morfina|fentanilo|metadona|oxicodona/.test(text)) return 'FRACTION_I';
  if (/lorazepam|diazepam|clonazepam|alprazolam|tramadol|codeina|buprenorfina/.test(text)) return 'FRACTION_III';
  if (/metilfenidato/.test(text)) return 'FRACTION_II';
  return 'NOT_APPLICABLE';
}

// ─── Escape CSV ───────────────────────────────────────────────────────────────
function csvCell(value) {
  const str = String(value ?? '').replace(/\r?\n/g, ' ');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCsv(obj) {
  return HEADERS.map((h) => csvCell(obj[h])).join(',');
}

// ─── Transformar un registro ──────────────────────────────────────────────────
function transform(record, sourceType) {
  const articulo = (record['Articulo'] || '').trim();
  const formula = (record['Fórmula'] || '').trim();
  const laboratorio = (record['Laboratorio'] || '').trim();
  const codigoInterno = String(record['C.Interno'] || record['C. Interno'] || '').trim();
  const codigoBarras = String(record['Código de Barras'] || '').trim();

  // Stock: usar General si Tijuana es 0 (distribuidor multi-sucursal)
  const tijuana = parseInt(String(record['Tijuana'] || '0').trim(), 10) || 0;
  const general = parseInt(String(record['General'] || '0').trim(), 10) || 0;
  const stock = general > 0 ? general : tijuana;

  const precioVenta = cleanPrice(record['Precio Venta'] || '');

  const sku = sourceType === 'PATENTE' ? `PAT-${codigoInterno}` : `GEN-${codigoInterno}`;

  // Si el precio es 0, marcar como inactivo (sin precio establecido)
  const isActive = parseFloat(precioVenta) > 0 ? 'true' : 'false';

  return {
    sku,
    commercialName: articulo,
    genericName: extractGenericName(formula),
    activeIngredient: extractActiveIngredient(formula),
    laboratory: laboratorio || 'Sin Laboratorio',
    category: detectCategory(formula, articulo, sourceType),
    pharmaceuticalForm: extractForm(articulo),
    concentration: extractConcentration(formula),
    presentation: extractPresentation(articulo),
    sanitaryRegistration: codigoBarras,
    healthFraction: detectFraction(formula, articulo),
    requiresPrescription: detectPrescription(formula, articulo),
    requiresRetainedPrescription: 'false',
    isControlled: detectControlled(formula, articulo),
    productType: detectProductType(formula, articulo, sourceType),
    price: precioVenta,
    stock: String(stock),
    imageUrl: '',
    description: formula,
    isActive,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const stripBom = (s) => s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
const patentes = JSON.parse(stripBom(readFileSync(PATENTES_JSON, 'utf8')));
const genericos = JSON.parse(stripBom(readFileSync(GENERICOS_JSON, 'utf8')));

const rows = [
  ...patentes.map((r) => transform(r, 'PATENTE')),
  ...genericos.map((r) => transform(r, 'GENERICO')),
];

// Detectar SKUs duplicados
const skuSeen = new Map();
for (const row of rows) {
  if (skuSeen.has(row.sku)) {
    // Añadir sufijo para deduplicar
    let suffix = 2;
    while (skuSeen.has(`${row.sku}-${suffix}`)) suffix++;
    row.sku = `${row.sku}-${suffix}`;
  }
  skuSeen.set(row.sku, true);
}

// Estadísticas
const stats = {
  total: rows.length,
  activos: rows.filter((r) => r.isActive === 'true').length,
  sinPrecio: rows.filter((r) => r.isActive === 'false').length,
  porCategoria: {},
  porTipo: {},
  porForma: {},
};
for (const row of rows) {
  stats.porCategoria[row.category] = (stats.porCategoria[row.category] || 0) + 1;
  stats.porTipo[row.productType] = (stats.porTipo[row.productType] || 0) + 1;
  stats.porForma[row.pharmaceuticalForm] = (stats.porForma[row.pharmaceuticalForm] || 0) + 1;
}

const csv = `﻿${HEADERS.join(',')}\r\n${rows.map(rowToCsv).join('\r\n')}\r\n`;
writeFileSync(OUTPUT_CSV, csv, 'utf8');

console.log(`\n✓ CSV generado: ${OUTPUT_CSV}`);
console.log(`\nResumen:`);
console.log(`  Total filas    : ${stats.total}`);
console.log(`  Con precio     : ${stats.activos}`);
console.log(`  Sin precio ($0): ${stats.sinPrecio}`);

console.log('\nDistribución por categoría:');
for (const [cat, n] of Object.entries(stats.porCategoria).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${cat}`);
}

console.log('\nDistribución por tipo:');
for (const [tipo, n] of Object.entries(stats.porTipo).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${tipo}`);
}

console.log('\nDistribución por forma farmacéutica:');
for (const [forma, n] of Object.entries(stats.porForma).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${forma}`);
}
