-- SQLite equivalent — periodType stored as TEXT (no enum support).

CREATE TABLE "SalesPeriod" (
    "id"                    TEXT     NOT NULL PRIMARY KEY,
    "periodType"            TEXT     NOT NULL,
    "label"                 TEXT     NOT NULL,
    "startDate"             DATETIME NOT NULL,
    "endDate"               DATETIME NOT NULL,
    "revenueCents"          INTEGER  NOT NULL DEFAULT 0,
    "orderCount"            INTEGER  NOT NULL DEFAULT 0,
    "unitsSold"             INTEGER  NOT NULL DEFAULT 0,
    "projectedRevenueCents" INTEGER  NOT NULL DEFAULT 0,
    "projectedOrderCount"   INTEGER  NOT NULL DEFAULT 0,
    "projectedUnitsSold"    INTEGER  NOT NULL DEFAULT 0,
    "isComplete"            BOOLEAN  NOT NULL DEFAULT false,
    "computedAt"            DATETIME,
    "createdAt"             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "SalesPeriod_periodType_startDate_key" ON "SalesPeriod"("periodType", "startDate");
CREATE INDEX "SalesPeriod_periodType_startDate_idx"        ON "SalesPeriod"("periodType", "startDate");
