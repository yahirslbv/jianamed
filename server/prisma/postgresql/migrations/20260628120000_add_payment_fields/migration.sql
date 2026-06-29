-- Add PaymentStatus enum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'FAILED', 'EXPIRED');

-- Add payment fields to Order
ALTER TABLE "Order"
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  ADD COLUMN "stripeSessionId" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "paymentMethod" TEXT;

CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");

-- PendingCheckout: temporary cart+checkout store while client completes Stripe payment
CREATE TABLE "PendingCheckout" (
  "id"              TEXT         NOT NULL,
  "userId"          TEXT         NOT NULL,
  "stripeSessionId" TEXT         NOT NULL,
  "cartJson"        TEXT         NOT NULL,
  "checkoutJson"    TEXT         NOT NULL,
  "observations"    TEXT,
  "expiresAt"       TIMESTAMP(3) NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PendingCheckout_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PendingCheckout_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PendingCheckout_stripeSessionId_key" ON "PendingCheckout"("stripeSessionId");
CREATE INDEX "PendingCheckout_stripeSessionId_idx"          ON "PendingCheckout"("stripeSessionId");
CREATE INDEX "PendingCheckout_expiresAt_idx"                ON "PendingCheckout"("expiresAt");
