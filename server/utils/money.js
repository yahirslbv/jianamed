export const MONEY_SCALE = 100;
export const PERCENTAGE_SCALE = 100;

function parseScaledInteger(value, scale) {
  const text = String(value ?? '').trim().replace(/[$,\s]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;

  const [whole, fraction = ''] = text.split('.');
  const paddedFraction = `${fraction}00`.slice(0, 2);
  const scaled = Number(whole) * scale + Number(paddedFraction);
  return Number.isSafeInteger(scaled) ? scaled : null;
}

export function parseMoneyInput(value) {
  return parseScaledInteger(value, MONEY_SCALE);
}

export function parsePercentageInput(value) {
  return parseScaledInteger(value, PERCENTAGE_SCALE);
}

export function moneyToNumber(cents) {
  return Number(cents || 0) / MONEY_SCALE;
}

export function formatMoneyMXN(cents) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(moneyToNumber(cents));
}

export function addMoney(...amounts) {
  return amounts.reduce((total, amount) => total + Number(amount || 0), 0);
}

export function subtractMoney(amount, discount) {
  return Math.max(0, Number(amount || 0) - Number(discount || 0));
}

export function multiplyMoney(cents, quantity) {
  return Number(cents || 0) * Number(quantity || 0);
}

export function calculateDiscount(baseCents, offer) {
  if (!offer) return 0;
  const rawDiscount = offer.discountType === 'PERCENTAGE'
    ? Math.round((baseCents * Number(offer.discountPercentageBps || 0)) / 10000)
    : Number(offer.discountValueCents || 0);
  return Math.max(0, Math.min(Number(baseCents || 0), rawDiscount));
}

export function calculateLineSubtotal(unitPriceCents, quantity) {
  return multiplyMoney(unitPriceCents, quantity);
}

export function calculateOrderTotals(lines) {
  return lines.reduce((totals, line) => {
    const originalLineTotalCents = calculateLineSubtotal(line.originalUnitPriceCents, line.quantity);
    const discountLineTotalCents = calculateLineSubtotal(line.discountAmountCents, line.quantity);
    return {
      subtotalCents: addMoney(totals.subtotalCents, originalLineTotalCents),
      discountTotalCents: addMoney(totals.discountTotalCents, discountLineTotalCents),
      totalCents: addMoney(totals.totalCents, subtractMoney(originalLineTotalCents, discountLineTotalCents)),
    };
  }, { subtotalCents: 0, discountTotalCents: 0, totalCents: 0 });
}
