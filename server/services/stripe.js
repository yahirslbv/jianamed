import Stripe from 'stripe';

// Stripe client is lazy-initialized once per process. Re-creating it on every
// request is wasteful and causes unnecessary TLS handshakes.
let _stripe = null;

function getStripeClient() {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY no está configurado.');
  // No pinning apiVersion — uses the default of the installed SDK version
  _stripe = new Stripe(key);
  return _stripe;
}

/**
 * Creates a Stripe Checkout Session for one-time payment.
 * @param {object} options
 * @param {Array<{name: string, unitAmountCents: number, quantity: number}>} options.lineItems
 * @param {string} options.customerEmail
 * @param {string} options.pendingCheckoutId
 * @param {string} options.successUrl  full URL with {CHECKOUT_SESSION_ID} placeholder
 * @param {string} options.cancelUrl
 * @returns {Promise<import('stripe').Stripe.Checkout.Session>}
 */
export async function createCheckoutSession({ lineItems, customerEmail, pendingCheckoutId, successUrl, cancelUrl }) {
  const stripe = getStripeClient();

  return stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'mxn',
    payment_method_types: ['card'],
    line_items: lineItems.map((item) => ({
      price_data: {
        currency: 'mxn',
        product_data: { name: item.name },
        unit_amount: item.unitAmountCents, // Stripe expects integer cents
      },
      quantity: item.quantity,
    })),
    customer_email: customerEmail || undefined,
    metadata: { pendingCheckoutId },
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Session expires in 30 minutes (Stripe minimum)
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    // Collect billing details for invoice/fiscal records
    payment_intent_data: {
      description: 'Pedido Tic Toc Pharma',
      metadata: { pendingCheckoutId },
    },
  });
}

/**
 * Verifies and constructs a Stripe webhook event from raw request body.
 * @param {Buffer} rawBody
 * @param {string} signature  value of the 'stripe-signature' header
 * @returns {import('stripe').Stripe.Event}
 */
export function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET no está configurado.');
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
