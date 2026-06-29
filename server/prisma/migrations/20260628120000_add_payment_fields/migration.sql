-- SQLite equivalent of the PostgreSQL payment fields migration.
-- SQLite has no enum types; all status fields are TEXT with a CHECK constraint.
-- Columns added via ALTER TABLE ADD COLUMN (supported for nullable or DEFAULT-backed cols).

-- ─── Order: add payment tracking columns ────────────────────────────────────────

ALTER TABLE "Order" ADD COLUMN "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT';
ALTER TABLE "Order" ADD COLUMN "stripeSessionId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- ─── PendingCheckout ─────────────────────────────────────────────────────────────

-- Temporary store: cart + checkout data while Stripe Checkout is in progress.
-- Deleted automatically when the webhook confirms payment or when the session expires.
CREATE TABLE "PendingCheckout" (
    "id"              TEXT     NOT NULL PRIMARY KEY,
    "userId"          TEXT     NOT NULL,
    "stripeSessionId" TEXT     NOT NULL,
    "cartJson"        TEXT     NOT NULL,
    "checkoutJson"    TEXT     NOT NULL,
    "observations"    TEXT,
    "expiresAt"       DATETIME NOT NULL,
    "createdAt"       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingCheckout_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingCheckout_stripeSessionId_key" ON "PendingCheckout"("stripeSessionId");

-- CreateIndex
CREATE INDEX "PendingCheckout_stripeSessionId_idx" ON "PendingCheckout"("stripeSessionId");

-- CreateIndex
CREATE INDEX "PendingCheckout_expiresAt_idx" ON "PendingCheckout"("expiresAt");
