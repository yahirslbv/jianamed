import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMoneyInput,
  parsePercentageInput,
  toMoneyDecimal,
  moneyToString,
  moneyToNumber,
  addMoney,
  subtractMoney,
  multiplyMoney,
  ensureNonNegativeMoney,
  calculatePercentageDiscount,
  calculateFixedDiscount,
  calculateDiscount,
  calculateFinalPrice,
  calculateLineSubtotal,
  calculateOrderTotals,
  MONEY_SCALE,
} from '../utils/money.js';

describe('parseMoneyInput', () => {
  it('parses integer amounts', () => assert.equal(parseMoneyInput('100'), 10000));
  it('parses decimal amounts', () => assert.equal(parseMoneyInput('1.50'), 150));
  it('parses zero', () => assert.equal(parseMoneyInput('0'), 0));
  it('parses with trailing zero', () => assert.equal(parseMoneyInput('1.50'), 150));
  it('parses with single decimal', () => assert.equal(parseMoneyInput('1.5'), 150));
  it('strips dollar sign and commas', () => assert.equal(parseMoneyInput('$1,234.56'), 123456));
  it('returns null for negative string', () => assert.equal(parseMoneyInput('-1'), null));
  it('returns null for empty string', () => assert.equal(parseMoneyInput(''), null));
  it('returns null for non-numeric string', () => assert.equal(parseMoneyInput('abc'), null));
  it('returns null for more than 2 decimal places', () => assert.equal(parseMoneyInput('1.999'), null));
  it('handles null input', () => assert.equal(parseMoneyInput(null), null));
});

describe('parsePercentageInput', () => {
  it('parses 10%', () => assert.equal(parsePercentageInput('10'), 1000));
  it('parses 0.5%', () => assert.equal(parsePercentageInput('0.5'), 50));
  it('parses 100%', () => assert.equal(parsePercentageInput('100'), 10000));
});

describe('moneyToString', () => {
  it('formats zero', () => assert.equal(moneyToString(0), '0.00'));
  it('formats 100 cents as 1.00', () => assert.equal(moneyToString(100), '1.00'));
  it('formats 150 cents as 1.50', () => assert.equal(moneyToString(150), '1.50'));
  it('formats 1999 cents as 19.99', () => assert.equal(moneyToString(1999), '19.99'));
  it('formats 5 cents as 0.05', () => assert.equal(moneyToString(5), '0.05'));
  it('rejects negative', () => assert.throws(() => moneyToString(-1), RangeError));
  it('rejects float cents', () => assert.throws(() => moneyToString(1.5), RangeError));
});

describe('moneyToNumber', () => {
  it('converts 100 cents to 1', () => assert.equal(moneyToNumber(100), 1));
  it('converts 0 to 0', () => assert.equal(moneyToNumber(0), 0));
  it('converts undefined to 0', () => assert.equal(moneyToNumber(undefined), 0));
});

describe('toMoneyDecimal', () => {
  it('converts integer cents', () => assert.equal(toMoneyDecimal(150), '1.50'));
  it('converts string money', () => assert.equal(toMoneyDecimal('1.50'), '1.50'));
  it('returns null for invalid', () => assert.equal(toMoneyDecimal('abc'), null));
});

describe('MONEY_SCALE', () => {
  it('is 100', () => assert.equal(MONEY_SCALE, 100));
});

describe('addMoney', () => {
  it('adds two amounts', () => assert.equal(addMoney(100, 200), 300));
  it('adds multiple amounts', () => assert.equal(addMoney(100, 200, 300), 600));
  it('adds zeros', () => assert.equal(addMoney(0, 0), 0));
  it('rejects negative', () => assert.throws(() => addMoney(100, -1), RangeError));
});

describe('subtractMoney', () => {
  it('subtracts smaller from larger', () => assert.equal(subtractMoney(500, 200), 300));
  it('clamps to zero when discount exceeds amount', () => assert.equal(subtractMoney(100, 200), 0));
  it('handles zero discount', () => assert.equal(subtractMoney(500, 0), 500));
});

describe('multiplyMoney', () => {
  it('multiplies by positive integer', () => assert.equal(multiplyMoney(100, 5), 500));
  it('multiplies by 1', () => assert.equal(multiplyMoney(150, 1), 150));
  it('multiplies by 0', () => assert.equal(multiplyMoney(150, 0), 0));
  it('rejects negative quantity', () => assert.throws(() => multiplyMoney(100, -1), RangeError));
  it('rejects float quantity', () => assert.throws(() => multiplyMoney(100, 1.5), RangeError));
});

describe('ensureNonNegativeMoney', () => {
  it('accepts zero', () => assert.equal(ensureNonNegativeMoney(0), 0));
  it('accepts positive integer', () => assert.equal(ensureNonNegativeMoney(100), 100));
  it('rejects negative', () => assert.throws(() => ensureNonNegativeMoney(-1), RangeError));
  it('rejects float', () => assert.throws(() => ensureNonNegativeMoney(1.5), RangeError));
});

describe('calculatePercentageDiscount', () => {
  it('10% of 1000 = 100', () => assert.equal(calculatePercentageDiscount(1000, 1000), 100));
  it('50% of 1000 = 500', () => assert.equal(calculatePercentageDiscount(1000, 5000), 500));
  it('0% of 1000 = 0', () => assert.equal(calculatePercentageDiscount(1000, 0), 0));
  it('100% of 1000 = 1000', () => assert.equal(calculatePercentageDiscount(1000, 10000), 1000));
  it('rejects bps > 10000', () => assert.throws(() => calculatePercentageDiscount(1000, 10001), RangeError));
  it('rejects negative bps', () => assert.throws(() => calculatePercentageDiscount(1000, -1), RangeError));
  it('rounds correctly — 33.33...% of 1000', () => {
    // 3333 bps of 1000 = 3333/10000 * 1000 = 333.3 → rounds to 333
    const result = calculatePercentageDiscount(1000, 3333);
    assert.equal(result, 333);
  });
});

describe('calculateFixedDiscount', () => {
  it('applies fixed discount', () => assert.equal(calculateFixedDiscount(1000, 200), 200));
  it('clamps to price when discount exceeds', () => assert.equal(calculateFixedDiscount(100, 200), 100));
  it('zero discount', () => assert.equal(calculateFixedDiscount(1000, 0), 0));
});

describe('calculateDiscount', () => {
  it('returns 0 when no offer', () => assert.equal(calculateDiscount(1000, null), 0));
  it('applies percentage offer', () => {
    const offer = { discountType: 'PERCENTAGE', discountPercentageBps: 1000 };
    assert.equal(calculateDiscount(1000, offer), 100);
  });
  it('applies fixed offer', () => {
    const offer = { discountType: 'FIXED', discountValueCents: 200 };
    assert.equal(calculateDiscount(1000, offer), 200);
  });
});

describe('calculateFinalPrice', () => {
  it('applies discount to price', () => {
    const offer = { discountType: 'FIXED', discountValueCents: 100 };
    assert.equal(calculateFinalPrice(1000, offer), 900);
  });
  it('returns full price when no offer', () => {
    assert.equal(calculateFinalPrice(1000, null), 1000);
  });
});

describe('calculateLineSubtotal', () => {
  it('multiplies unit price by quantity', () => assert.equal(calculateLineSubtotal(100, 5), 500));
  it('zero quantity gives 0', () => assert.equal(calculateLineSubtotal(100, 0), 0));
});

describe('calculateOrderTotals', () => {
  it('sums lines correctly', () => {
    const lines = [
      { originalUnitPriceCents: 1000, discountAmountCents: 100, quantity: 2 },
      { originalUnitPriceCents: 500, discountAmountCents: 0, quantity: 3 },
    ];
    const totals = calculateOrderTotals(lines);
    // subtotal: 2000 + 1500 = 3500
    assert.equal(totals.subtotalCents, 3500);
    // discount: 200 + 0 = 200
    assert.equal(totals.discountTotalCents, 200);
    // total: (2000-200) + (1500-0) = 1800 + 1500 = 3300
    assert.equal(totals.totalCents, 3300);
  });

  it('returns zeros for empty lines', () => {
    const totals = calculateOrderTotals([]);
    assert.equal(totals.subtotalCents, 0);
    assert.equal(totals.discountTotalCents, 0);
    assert.equal(totals.totalCents, 0);
  });
});
