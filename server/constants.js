export const ROLES = ['CLIENT', 'ADMIN', 'SALES', 'SUPERVISOR'];
export const INTERNAL_ROLES = ['ADMIN', 'SALES', 'SUPERVISOR'];

export function normalizeRole(role) {
  return String(role || '').toLowerCase();
}

export function normalizeInternalRole(role) {
  const normalized = String(role || '').trim().toUpperCase();
  return INTERNAL_ROLES.includes(normalized) ? normalized : null;
}

export const HEALTH_FRACTIONS = [
  'FRACTION_I',
  'FRACTION_II',
  'FRACTION_III',
  'FRACTION_IV',
  'FRACTION_V',
  'FRACTION_VI',
  'NOT_APPLICABLE',
];

export const PRODUCT_TYPES = [
  'MEDICINE',
  'GENERIC',
  'OTC',
  'RX',
  'HEALING_MATERIAL',
  'SUPPLEMENT',
  'PERFUMERY',
  'NATURISM',
  'MEDICAL_SUPPLY',
];

export const OFFER_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'];

export const ORDER_STATUSES = [
  'PENDING_REVIEW',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'SUPPLIED',
  'CANCELLED',
];

export const ORDER_STATUS_LABELS = {
  PENDING_REVIEW: 'Pendiente de revisión',
  IN_REVIEW: 'En revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  SUPPLIED: 'Surtido',
  CANCELLED: 'Cancelado',
};

export const PRODUCT_TYPE_LABELS = {
  MEDICINE: 'Medicamento',
  GENERIC: 'Genérico',
  OTC: 'OTC',
  RX: 'RX',
  HEALING_MATERIAL: 'Material de curación',
  SUPPLEMENT: 'Suplemento',
  PERFUMERY: 'Perfumería',
  NATURISM: 'Naturismo',
  MEDICAL_SUPPLY: 'Insumo médico',
};

export function isAllowed(value, allowedValues) {
  return allowedValues.includes(value);
}
