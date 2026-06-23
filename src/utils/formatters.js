export const mxnCurrency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyMXN(value) {
  return mxnCurrency.format(Number(value) || 0);
}

export function parseMoneyInput(value) {
  const text = String(value ?? '').trim().replace(/[$,\s]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(`${fraction}00`.slice(0, 2));
}

export function moneyFromCents(cents) {
  return Number(cents || 0) / 100;
}

export function multiplyMoney(amount, quantity) {
  const cents = parseMoneyInput(amount);
  return moneyFromCents((cents || 0) * Number(quantity || 0));
}

export function calculateOrderTotals(items) {
  return items.reduce((totals, item) => {
    const original = multiplyMoney(item.product.originalPrice ?? item.product.price, item.quantity);
    const final = multiplyMoney(item.product.price, item.quantity);
    return { subtotal: totals.subtotal + original, discount: totals.discount + (original - final), total: totals.total + final };
  }, { subtotal: 0, discount: 0, total: 0 });
}

export function formatDiscount(offer) {
  if (!offer) return '';
  return offer.discountType === 'PERCENTAGE'
    ? `${Number(offer.discountValue) || 0}%`
    : formatCurrencyMXN(offer.discountValue);
}
