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
 * Confirms a Stripe Checkout Session after the redirect back to the app and returns
 * the resulting order. The server verifies the payment and creates the order on the
 * spot (so it works in local development without the webhook). Retries while the
 * payment is still settling (HTTP 409).
 */
export async function confirmCheckoutSession(sessionId, { maxAttempts = 4, delayMs = 1500 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    try {
      const response = await apiClient('/payments/confirm', { method: 'POST', body: { sessionId } });
      return response.order;
    } catch (error) {
      lastError = error;
      // 409 — payment not settled yet; keep retrying. Any other error is terminal.
      if (error.status !== 409) throw error;
    }
  }
  throw lastError;
}
