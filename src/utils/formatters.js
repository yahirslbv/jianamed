export const mxnCurrency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyMXN(value) {
  return mxnCurrency.format(Number(value) || 0);
}

export function formatDiscount(offer) {
  if (!offer) return '';
  return offer.discountType === 'PERCENTAGE'
    ? `${Number(offer.discountValue) || 0}%`
    : formatCurrencyMXN(offer.discountValue);
}
