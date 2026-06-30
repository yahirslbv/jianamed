-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SalesPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "periodType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "revenueCents" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "unitsSold" INTEGER NOT NULL DEFAULT 0,
    "projectedRevenueCents" INTEGER NOT NULL DEFAULT 0,
    "projectedOrderCount" INTEGER NOT NULL DEFAULT 0,
    "projectedUnitsSold" INTEGER NOT NULL DEFAULT 0,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "computedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SalesPeriod" ("computedAt", "createdAt", "endDate", "id", "isComplete", "label", "orderCount", "periodType", "projectedOrderCount", "projectedRevenueCents", "projectedUnitsSold", "revenueCents", "startDate", "unitsSold", "updatedAt") SELECT "computedAt", "createdAt", "endDate", "id", "isComplete", "label", "orderCount", "periodType", "projectedOrderCount", "projectedRevenueCents", "projectedUnitsSold", "revenueCents", "startDate", "unitsSold", "updatedAt" FROM "SalesPeriod";
DROP TABLE "SalesPeriod";
ALTER TABLE "new_SalesPeriod" RENAME TO "SalesPeriod";
CREATE INDEX "SalesPeriod_periodType_startDate_idx" ON "SalesPeriod"("periodType", "startDate");
CREATE UNIQUE INDEX "SalesPeriod_periodType_startDate_key" ON "SalesPeriod"("periodType", "startDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
