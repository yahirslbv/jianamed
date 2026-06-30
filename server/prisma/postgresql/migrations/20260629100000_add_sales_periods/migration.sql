-- Add PeriodType enum
CREATE TYPE "PeriodType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'ANNUAL');

-- Create SalesPeriod table
CREATE TABLE "SalesPeriod" (
  "id"                    TEXT         NOT NULL,
  "periodType"            "PeriodType" NOT NULL,
  "label"                 TEXT         NOT NULL,
  "startDate"             TIMESTAMP(3) NOT NULL,
  "endDate"               TIMESTAMP(3) NOT NULL,
  "revenueCents"          INTEGER      NOT NULL DEFAULT 0,
  "orderCount"            INTEGER      NOT NULL DEFAULT 0,
  "unitsSold"             INTEGER      NOT NULL DEFAULT 0,
  "projectedRevenueCents" INTEGER      NOT NULL DEFAULT 0,
  "projectedOrderCount"   INTEGER      NOT NULL DEFAULT 0,
  "projectedUnitsSold"    INTEGER      NOT NULL DEFAULT 0,
  "isComplete"            BOOLEAN      NOT NULL DEFAULT false,
  "computedAt"            TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesPeriod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalesPeriod_periodType_startDate_key" ON "SalesPeriod"("periodType", "startDate");
CREATE INDEX "SalesPeriod_periodType_startDate_idx"        ON "SalesPeriod"("periodType", "startDate");
