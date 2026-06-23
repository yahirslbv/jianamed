-- Convert persisted monetary values to integer cents while preserving existing data.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Customer" (
  "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "businessName" TEXT NOT NULL,
  "commercialName" TEXT, "rfc" TEXT, "contactName" TEXT NOT NULL, "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL, "city" TEXT NOT NULL, "state" TEXT NOT NULL, "postalCode" TEXT NOT NULL,
  "sanitaryLicense" TEXT, "isAuthorized" BOOLEAN NOT NULL DEFAULT true,
  "creditEnabled" BOOLEAN NOT NULL DEFAULT false, "creditLimitCents" INTEGER NOT NULL DEFAULT 0,
  "creditUsedCents" INTEGER NOT NULL DEFAULT 0, "creditStatus" TEXT NOT NULL DEFAULT 'DISABLED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("id", "userId", "businessName", "commercialName", "rfc", "contactName", "phone", "address", "city", "state", "postalCode", "sanitaryLicense", "isAuthorized", "creditEnabled", "creditLimitCents", "creditUsedCents", "creditStatus", "createdAt", "updatedAt")
SELECT "id", "userId", "businessName", "commercialName", "rfc", "contactName", "phone", "address", "city", "state", "postalCode", "sanitaryLicense", "isAuthorized", "creditEnabled", CAST(ROUND("creditLimit" * 100) AS INTEGER), CAST(ROUND("creditUsed" * 100) AS INTEGER), "creditStatus", "createdAt", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

CREATE TABLE "new_Product" (
  "id" TEXT NOT NULL PRIMARY KEY, "sku" TEXT NOT NULL, "commercialName" TEXT NOT NULL, "genericName" TEXT NOT NULL,
  "activeIngredient" TEXT NOT NULL, "laboratoryId" TEXT NOT NULL, "categoryId" TEXT NOT NULL, "pharmaceuticalForm" TEXT NOT NULL,
  "concentration" TEXT NOT NULL, "presentation" TEXT NOT NULL, "sanitaryRegistration" TEXT, "healthFraction" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
  "requiresPrescription" BOOLEAN NOT NULL DEFAULT false, "requiresRetainedPrescription" BOOLEAN NOT NULL DEFAULT false,
  "isControlled" BOOLEAN NOT NULL DEFAULT false, "productType" TEXT NOT NULL, "priceCents" INTEGER NOT NULL, "stock" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT, "description" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Product_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("id", "sku", "commercialName", "genericName", "activeIngredient", "laboratoryId", "categoryId", "pharmaceuticalForm", "concentration", "presentation", "sanitaryRegistration", "healthFraction", "requiresPrescription", "requiresRetainedPrescription", "isControlled", "productType", "priceCents", "stock", "imageUrl", "description", "isActive", "createdAt", "updatedAt")
SELECT "id", "sku", "commercialName", "genericName", "activeIngredient", "laboratoryId", "categoryId", "pharmaceuticalForm", "concentration", "presentation", "sanitaryRegistration", "healthFraction", "requiresPrescription", "requiresRetainedPrescription", "isControlled", "productType", CAST(ROUND("price" * 100) AS INTEGER), "stock", "imageUrl", "description", "isActive", "createdAt", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_laboratoryId_idx" ON "Product"("laboratoryId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

CREATE TABLE "new_Offer" (
  "id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT, "discountType" TEXT NOT NULL,
  "discountValueCents" INTEGER, "discountPercentageBps" INTEGER, "startsAt" DATETIME NOT NULL, "endsAt" DATETIME NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "productId" TEXT, "laboratoryId" TEXT, "categoryId" TEXT, "productType" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Offer_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Offer_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Offer" ("id", "title", "description", "discountType", "discountValueCents", "discountPercentageBps", "startsAt", "endsAt", "isActive", "productId", "laboratoryId", "categoryId", "productType", "createdAt", "updatedAt")
SELECT "id", "title", "description", "discountType", CASE WHEN "discountType" = 'FIXED_AMOUNT' THEN CAST(ROUND("discountValue" * 100) AS INTEGER) ELSE NULL END, CASE WHEN "discountType" = 'PERCENTAGE' THEN CAST(ROUND("discountValue" * 100) AS INTEGER) ELSE NULL END, "startsAt", "endsAt", "isActive", "productId", "laboratoryId", "categoryId", "productType", "createdAt", "updatedAt" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE INDEX "Offer_isActive_startsAt_endsAt_idx" ON "Offer"("isActive", "startsAt", "endsAt");
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");
CREATE INDEX "Offer_laboratoryId_idx" ON "Offer"("laboratoryId");
CREATE INDEX "Offer_categoryId_idx" ON "Offer"("categoryId");

CREATE TABLE "new_Order" (
  "id" TEXT NOT NULL PRIMARY KEY, "folio" TEXT NOT NULL, "userId" TEXT NOT NULL, "customerId" TEXT NOT NULL,
  "clientName" TEXT, "clientEmail" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW', "subtotalCents" INTEGER NOT NULL,
  "discountTotalCents" INTEGER NOT NULL DEFAULT 0, "totalCents" INTEGER NOT NULL, "deliveryAddress" TEXT, "deliveryCity" TEXT,
  "deliveryState" TEXT, "deliveryPostalCode" TEXT, "billingBusinessName" TEXT, "billingRfc" TEXT, "billingAddress" TEXT,
  "responsibleName" TEXT, "responsiblePhone" TEXT, "observations" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "folio", "userId", "customerId", "clientName", "clientEmail", "status", "subtotalCents", "discountTotalCents", "totalCents", "deliveryAddress", "deliveryCity", "deliveryState", "deliveryPostalCode", "billingBusinessName", "billingRfc", "billingAddress", "responsibleName", "responsiblePhone", "observations", "createdAt", "updatedAt")
SELECT "id", "folio", "userId", "customerId", "clientName", "clientEmail", "status", CAST(ROUND("subtotal" * 100) AS INTEGER), CAST(ROUND("discountTotal" * 100) AS INTEGER), CAST(ROUND("total" * 100) AS INTEGER), "deliveryAddress", "deliveryCity", "deliveryState", "deliveryPostalCode", "billingBusinessName", "billingRfc", "billingAddress", "responsibleName", "responsiblePhone", "observations", "createdAt", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_folio_key" ON "Order"("folio");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_status_idx" ON "Order"("status");

CREATE TABLE "new_OrderItem" (
  "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "productId" TEXT NOT NULL, "sku" TEXT NOT NULL, "productName" TEXT NOT NULL,
  "laboratoryName" TEXT NOT NULL, "presentation" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitPriceCents" INTEGER NOT NULL,
  "originalUnitPriceCents" INTEGER NOT NULL DEFAULT 0, "discountAmountCents" INTEGER NOT NULL DEFAULT 0, "offerTitle" TEXT, "subtotalCents" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("id", "orderId", "productId", "sku", "productName", "laboratoryName", "presentation", "quantity", "unitPriceCents", "originalUnitPriceCents", "discountAmountCents", "offerTitle", "subtotalCents")
SELECT "id", "orderId", "productId", "sku", "productName", "laboratoryName", "presentation", "quantity", CAST(ROUND("unitPrice" * 100) AS INTEGER), CAST(ROUND("originalUnitPrice" * 100) AS INTEGER), CAST(ROUND("discountAmount" * 100) AS INTEGER), "offerTitle", CAST(ROUND("subtotal" * 100) AS INTEGER) FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
