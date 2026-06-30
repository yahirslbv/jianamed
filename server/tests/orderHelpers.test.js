import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeItems, getCheckoutSnapshot } from '../utils/orderHelpers.js';

const validCheckout = {
  deliveryAddress: 'Av. Revolución 123',
  deliveryCity: 'Tijuana',
  deliveryState: 'Baja California',
  deliveryPostalCode: '22000',
  responsibleName: 'Juan Pérez',
  responsiblePhone: '6641234567',
};

const validUser = {
  name: 'Demo Client',
  email: 'demo@test.invalid',
  customer: {
    businessName: 'Farmacia Test SA',
    address: 'Av. Revolución 123',
    city: 'Tijuana',
    state: 'Baja California',
    postalCode: '22000',
    contactName: 'Juan Pérez',
    phone: '6641234567',
    rfc: 'TFP990101ABC',
  },
};

describe('normalizeItems', () => {
  it('accepts valid single item', () => {
    const result = normalizeItems([{ productId: 'abc', quantity: 2 }]);
    assert.ok(!result.error);
    assert.deepEqual(result.items, [{ productId: 'abc', quantity: 2 }]);
  });

  it('deduplicates items with same productId', () => {
    const result = normalizeItems([
      { productId: 'abc', quantity: 2 },
      { productId: 'abc', quantity: 3 },
    ]);
    assert.ok(!result.error);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].quantity, 5);
  });

  it('accepts multiple different products', () => {
    const result = normalizeItems([
      { productId: 'abc', quantity: 1 },
      { productId: 'def', quantity: 4 },
    ]);
    assert.ok(!result.error);
    assert.equal(result.items.length, 2);
  });

  it('rejects empty array', () => {
    const result = normalizeItems([]);
    assert.ok(result.error);
  });

  it('rejects null', () => {
    const result = normalizeItems(null);
    assert.ok(result.error);
  });

  it('rejects non-array', () => {
    const result = normalizeItems({ productId: 'abc', quantity: 1 });
    assert.ok(result.error);
  });

  it('rejects item without productId', () => {
    const result = normalizeItems([{ quantity: 2 }]);
    assert.ok(result.error);
  });

  it('rejects zero quantity', () => {
    const result = normalizeItems([{ productId: 'abc', quantity: 0 }]);
    assert.ok(result.error);
  });

  it('rejects negative quantity', () => {
    const result = normalizeItems([{ productId: 'abc', quantity: -1 }]);
    assert.ok(result.error);
  });

  it('truncates fractional quantity to integer via parseInt', () => {
    const result = normalizeItems([{ productId: 'abc', quantity: 1.5 }]);
    // parseInt(1.5) === 1, which is valid — the function normalizes floats
    assert.ok(!result.error);
    assert.equal(result.items[0].quantity, 1);
  });

  it('coerces string quantity to int', () => {
    const result = normalizeItems([{ productId: 'abc', quantity: '3' }]);
    assert.ok(!result.error);
    assert.equal(result.items[0].quantity, 3);
  });
});

describe('getCheckoutSnapshot', () => {
  it('builds snapshot from provided fields', () => {
    const result = getCheckoutSnapshot(validCheckout, validUser);
    assert.ok(!result.error);
    assert.equal(result.data.deliveryCity, 'Tijuana');
    assert.equal(result.data.deliveryState, 'Baja California');
  });

  it('falls back to customer data when checkout fields are empty', () => {
    const result = getCheckoutSnapshot({}, validUser);
    assert.ok(!result.error);
    assert.equal(result.data.deliveryAddress, validUser.customer.address);
    assert.equal(result.data.responsibleName, validUser.customer.contactName);
    assert.equal(result.data.responsiblePhone, validUser.customer.phone);
  });

  it('falls back to user name as clientName when customer has no businessName', () => {
    const user = { ...validUser, customer: { ...validUser.customer, businessName: undefined } };
    const result = getCheckoutSnapshot(validCheckout, user);
    assert.ok(!result.error);
  });

  it('returns error when required field is missing and customer has no fallback', () => {
    const userWithoutAddress = {
      name: 'Test',
      email: 'test@test.invalid',
      customer: {
        businessName: 'Test SA',
        contactName: 'Test',
        phone: '1234567890',
        address: '',
        city: '',
        state: '',
        postalCode: '',
      },
    };
    const result = getCheckoutSnapshot({}, userWithoutAddress);
    assert.ok(result.error);
  });

  it('trims whitespace from fields', () => {
    const checkout = { ...validCheckout, deliveryCity: '  Tijuana  ' };
    const result = getCheckoutSnapshot(checkout, validUser);
    assert.ok(!result.error);
    assert.equal(result.data.deliveryCity, 'Tijuana');
  });

  it('includes all required fields in snapshot', () => {
    const result = getCheckoutSnapshot(validCheckout, validUser);
    assert.ok(!result.error);
    const required = ['deliveryAddress', 'deliveryCity', 'deliveryState', 'deliveryPostalCode', 'responsibleName', 'responsiblePhone'];
    for (const field of required) {
      assert.ok(result.data[field], `Expected ${field} to be present`);
    }
  });
});
