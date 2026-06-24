const MONEY_SCALE = 100;

export const mxnCurrency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyMXN(value) {
  return mxnCurrency.format(Number(value) || 0);
}

/** Parses a user/API decimal amount to integer cents without floating-point math. */
export function parseCurrencyInput(value) {
  const text = String(value ?? '').trim().replace(/[$,\s]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const cents = BigInt(whole) * 100n + BigInt(`${fraction}00`.slice(0, 2));
  return cents <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(cents) : null;
}

// Kept as an alias for existing form code.
export const parseMoneyInput = parseCurrencyInput;

export function normalizeMoneyInput(value) {
  const cents = parseCurrencyInput(value);
  if (cents === null) return '';
  return `${Math.floor(cents / MONEY_SCALE)}.${String(cents % MONEY_SCALE).padStart(2, '0')}`;
}

export function moneyFromCents(cents) {
  return Number(cents || 0) / MONEY_SCALE;
}

export function multiplyMoney(amount, quantity) {
  const cents = parseCurrencyInput(amount);
  const safeQuantity = Number.parseInt(quantity, 10);
  if (cents === null || !Number.isSafeInteger(safeQuantity) || safeQuantity < 0) return 0;
  return moneyFromCents(cents * safeQuantity);
}

export function calculateOrderTotals(items) {
  const totals = items.reduce((current, item) => {
    const originalCents = parseCurrencyInput(item.product.originalPrice ?? item.product.price) ?? 0;
    const finalCents = parseCurrencyInput(item.product.price) ?? 0;
    const quantity = Number.parseInt(item.quantity, 10);
    const safeQuantity = Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0;
    return {
      subtotalCents: current.subtotalCents + originalCents * safeQuantity,
      discountCents: current.discountCents + Math.max(0, originalCents - finalCents) * safeQuantity,
      totalCents: current.totalCents + finalCents * safeQuantity,
    };
  }, { subtotalCents: 0, discountCents: 0, totalCents: 0 });

  return {
    ...totals,
    subtotal: moneyFromCents(totals.subtotalCents),
    discount: moneyFromCents(totals.discountCents),
    total: moneyFromCents(totals.totalCents),
  };
}

export function formatDiscount(offer) {
  if (!offer) return '';
  return offer.discountType === 'PERCENTAGE'
    ? `${Number(offer.discountValue) || 0}%`
    : formatCurrencyMXN(offer.discountValue);
}
