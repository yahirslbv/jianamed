import { apiClient } from './apiClient.js';

/**
 * Asks the server to create a Stripe Checkout Session.
 * Returns { url, sessionId } — redirect the browser to `url`.
 */
export async function createCheckoutSession({ items, checkout, observations }) {
  return apiClient('/payments/checkout-session', {
    method: 'POST',
    body: {
      items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      checkout,
      observations,
    },
  });
}

/**
 * Polls for an order created by the Stripe webhook, identified by sessionId.
 * Retries up to `maxAttempts` times with `delayMs` between each.
 */
export async function pollOrderBySessionId(sessionId, { maxAttempts = 5, delayMs = 1500 } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      const response = await apiClient(`/orders/by-session/${encodeURIComponent(sessionId)}`);
      if (response?.order) return response.order;
    } catch {
      // 404 means the webhook hasn't fired yet — keep polling
    }
  }
  return null;
}
