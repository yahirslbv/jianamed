export const MONEY_SCALE = 100;
export const PERCENTAGE_SCALE = 100;

function parseScaledInteger(value, scale) {
  const text = String(value ?? '').trim().replace(/[$,\s]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;

  const [whole, fraction = ''] = text.split('.');
  const paddedFraction = `${fraction}00`.slice(0, 2);
  const scaled = BigInt(whole) * BigInt(scale) + BigInt(paddedFraction);
  return scaled <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(scaled) : null;
}

export function parseMoneyInput(value) {
  return parseScaledInteger(value, MONEY_SCALE);
}

export function parsePercentageInput(value) {
  return parseScaledInteger(value, PERCENTAGE_SCALE);
}

// Monetary amounts are persisted as integer cents. This decimal string is safe for logs,
// CSV exports and integrations that expect a two-decimal amount.
export function toMoneyDecimal(value) {
  const cents = typeof value === 'number' && Number.isSafeInteger(value)
    ? ensureNonNegativeMoney(value)
    : parseMoneyInput(value);
  return cents === null ? null : moneyToString(cents);
}

export function moneyToNumber(cents) {
  return Number(cents || 0) / MONEY_SCALE;
}

export function moneyToString(cents) {
  const safeCents = ensureNonNegativeMoney(cents);
  const whole = Math.floor(safeCents / MONEY_SCALE);
  return `${whole}.${String(safeCents % MONEY_SCALE).padStart(2, '0')}`;
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
  const total = amounts.reduce((sum, amount) => sum + BigInt(ensureNonNegativeMoney(amount)), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('El monto excede el límite permitido.');
  return Number(total);
}

export function subtractMoney(amount, discount) {
  return Math.max(0, ensureNonNegativeMoney(amount) - ensureNonNegativeMoney(discount));
}

export function multiplyMoney(cents, quantity) {
  const safeQuantity = Number(quantity);
  if (!Number.isSafeInteger(safeQuantity) || safeQuantity < 0) {
    throw new RangeError('La cantidad debe ser un entero no negativo.');
  }
  const total = BigInt(ensureNonNegativeMoney(cents)) * BigInt(safeQuantity);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('El monto excede el límite permitido.');
  return Number(total);
}

export function ensureNonNegativeMoney(value) {
  const amount = Number(value ?? 0);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError('El monto debe ser un entero no negativo en centavos.');
  }
  return amount;
}

export function calculatePercentageDiscount(priceCents, percentageBps) {
  const price = ensureNonNegativeMoney(priceCents);
  const percentage = Number(percentageBps ?? 0);
  if (!Number.isSafeInteger(percentage) || percentage < 0 || percentage > 10000) {
    throw new RangeError('El porcentaje debe estar entre 0 y 100.');
  }
  // Round once at the cent boundary; no binary floating-point arithmetic is involved.
  return Math.min(price, Number((BigInt(price) * BigInt(percentage) + 5000n) / 10000n));
}

export function calculateFixedDiscount(priceCents, discountCents) {
  return Math.min(ensureNonNegativeMoney(priceCents), ensureNonNegativeMoney(discountCents));
}

export function calculateDiscount(baseCents, offer) {
  if (!offer) return 0;
  return offer.discountType === 'PERCENTAGE'
    ? calculatePercentageDiscount(baseCents, offer.discountPercentageBps)
    : calculateFixedDiscount(baseCents, offer.discountValueCents);
}

export function calculateFinalPrice(priceCents, offer) {
  return subtractMoney(priceCents, calculateDiscount(priceCents, offer));
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
