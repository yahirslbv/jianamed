/**
 * Housekeeping helpers for the payment subsystem.
 */

/**
 * Deletes PendingCheckout rows whose Stripe session has expired.
 * Called periodically from the server cleanup timer.
 * @param {import('@prisma/client').PrismaClient} client
 */
export function purgeExpiredPendingCheckouts(client) {
  return client.pendingCheckout.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
