/**
 * Helpers shared between the direct-order flow (routes/orders.js)
 * and the Stripe-payment flow (routes/payments.js).
 *
 * Keep this module free of HTTP/Express dependencies so it stays
 * testable in isolation.
 */

// ─── Item normalisation ───────────────────────────────────────────────────────

/**
 * Validates and deduplicates cart items from the request body.
 * Returns { error } on validation failure or { items } on success.
 *
 * @param {unknown} items
 * @returns {{ error: string } | { items: Array<{ productId: string, quantity: number }> }}
 */
export function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'El pedido debe incluir al menos un producto.' };
  }

  const quantities = new Map();
  for (const item of items) {
    const productId = item.productId;
    const quantity = Number.parseInt(item.quantity, 10);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return { error: 'Cada producto debe tener una cantidad válida.' };
    }

    quantities.set(productId, (quantities.get(productId) || 0) + quantity);
  }

  return {
    items: Array.from(quantities, ([productId, quantity]) => ({ productId, quantity })),
  };
}

// ─── Checkout snapshot ────────────────────────────────────────────────────────

function cleanText(value, fallback = '') {
  return value?.toString().trim() || fallback;
}

/**
 * Builds a validated checkout snapshot from request body + user/customer defaults.
 * Returns { error } on missing required field or { data } on success.
 *
 * @param {object} checkout  — req.body.checkout
 * @param {object} user      — req.user (with .customer)
 * @returns {{ error: string } | { data: object }}
 */
export function getCheckoutSnapshot(checkout = {}, user) {
  const customer = user.customer;
  const snapshot = {
    clientName: cleanText(checkout.clientName, customer?.businessName || user.name),
    clientEmail: cleanText(checkout.clientEmail, user.email),
    deliveryAddress: cleanText(checkout.deliveryAddress, customer?.address),
    deliveryCity: cleanText(checkout.deliveryCity, customer?.city),
    deliveryState: cleanText(checkout.deliveryState, customer?.state),
    deliveryPostalCode: cleanText(checkout.deliveryPostalCode, customer?.postalCode),
    billingBusinessName: cleanText(checkout.billingBusinessName, customer?.businessName),
    billingRfc: cleanText(checkout.billingRfc, customer?.rfc || ''),
    billingAddress: cleanText(checkout.billingAddress, customer?.address),
    responsibleName: cleanText(checkout.responsibleName, customer?.contactName),
    responsiblePhone: cleanText(checkout.responsiblePhone, customer?.phone),
  };

  const requiredFields = [
    'deliveryAddress',
    'deliveryCity',
    'deliveryState',
    'deliveryPostalCode',
    'responsibleName',
    'responsiblePhone',
  ];

  const missingField = requiredFields.find((field) => !snapshot[field]);
  return missingField
    ? { error: `El campo ${missingField} es obligatorio.` }
    : { data: snapshot };
}

// ─── Folio generation ─────────────────────────────────────────────────────────

function buildOrderFolio(year, sequence) {
  return `PED-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Returns the next unique order folio for the given year, using the
 * OrderFolioSequence table as the persistent counter.
 *
 * Must be called inside a Prisma transaction so the counter increment
 * is atomic with the order creation.
 *
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {number} year
 * @returns {Promise<string>}
 */
export async function nextOrderFolio(tx, year) {
  let sequence = await tx.orderFolioSequence.upsert({
    where: { year },
    create: { year, nextValue: 1 },
    update: { nextValue: { increment: 1 } },
  });

  // Existing databases can contain orders created before OrderFolioSequence existed.
  // Advance safely until the persistent counter is beyond that legacy range.
  for (let attempts = 0; attempts < 100; attempts += 1) {
    const folio = buildOrderFolio(year, sequence.nextValue);
    const existing = await tx.order.findUnique({ where: { folio }, select: { id: true } });
    if (!existing) return folio;
    sequence = await tx.orderFolioSequence.update({
      where: { year },
      data: { nextValue: { increment: 1 } },
    });
  }

  throw new Error('No fue posible asignar un folio único al pedido.');
}
