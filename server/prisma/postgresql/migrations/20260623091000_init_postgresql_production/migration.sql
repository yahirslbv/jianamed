-- PostgreSQL production baseline. It is deliberately separate from the SQLite history:
-- Prisma migration locks and native enums are provider-specific.
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'ADMIN', 'SALES', 'SUPERVISOR');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_REVIEW', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUPPLIED', 'CANCELLED');
CREATE TYPE "ProductType" AS ENUM ('MEDICINE', 'GENERIC', 'OTC', 'RX', 'HEALING_MATERIAL', 'SUPPLEMENT', 'PERFUMERY', 'NATURISM', 'MEDICAL_SUPPLY');
CREATE TYPE "HealthFraction" AS ENUM ('FRACTION_I', 'FRACTION_II', 'FRACTION_III', 'FRACTION_IV', 'FRACTION_V', 'FRACTION_VI', 'NOT_APPLICABLE');
CREATE TYPE "OfferDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
CREATE TYPE "CreditStatus" AS ENUM ('DISABLED', 'ACTIVE', 'SUSPENDED');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL UNIQUE, "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'CLIENT', "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Customer" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "businessName" TEXT NOT NULL, "commercialName" TEXT, "rfc" TEXT, "contactName" TEXT NOT NULL, "phone" TEXT NOT NULL,
  "address" TEXT NOT NULL, "city" TEXT NOT NULL, "state" TEXT NOT NULL, "postalCode" TEXT NOT NULL, "sanitaryLicense" TEXT,
  "isAuthorized" BOOLEAN NOT NULL DEFAULT true, "creditEnabled" BOOLEAN NOT NULL DEFAULT false,
  "creditLimitCents" INTEGER NOT NULL DEFAULT 0, "creditUsedCents" INTEGER NOT NULL DEFAULT 0,
  "creditStatus" "CreditStatus" NOT NULL DEFAULT 'DISABLED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_credit_nonnegative" CHECK ("creditLimitCents" >= 0 AND "creditUsedCents" >= 0 AND "creditUsedCents" <= "creditLimitCents")
);
CREATE TABLE "Laboratory" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "slug" TEXT NOT NULL UNIQUE, "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Category" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "slug" TEXT NOT NULL UNIQUE, "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Product" (
  "id" TEXT PRIMARY KEY, "sku" TEXT NOT NULL UNIQUE, "commercialName" TEXT NOT NULL, "genericName" TEXT NOT NULL,
  "activeIngredient" TEXT NOT NULL, "laboratoryId" TEXT NOT NULL REFERENCES "Laboratory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "pharmaceuticalForm" TEXT NOT NULL, "concentration" TEXT NOT NULL, "presentation" TEXT NOT NULL, "sanitaryRegistration" TEXT,
  "healthFraction" "HealthFraction" NOT NULL DEFAULT 'NOT_APPLICABLE', "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
  "requiresRetainedPrescription" BOOLEAN NOT NULL DEFAULT false, "isControlled" BOOLEAN NOT NULL DEFAULT false,
  "productType" "ProductType" NOT NULL, "priceCents" INTEGER NOT NULL, "stock" INTEGER NOT NULL DEFAULT 0,
  "imageUrl" TEXT, "description" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_nonnegative" CHECK ("priceCents" >= 0 AND "stock" >= 0)
);
CREATE TABLE "Offer" (
  "id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT, "discountType" "OfferDiscountType" NOT NULL,
  "discountValueCents" INTEGER, "discountPercentageBps" INTEGER, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "productId" TEXT REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "laboratoryId" TEXT REFERENCES "Laboratory"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "categoryId" TEXT REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE, "productType" "ProductType",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Offer_date_range" CHECK ("startsAt" < "endsAt"),
  CONSTRAINT "Offer_discount_shape" CHECK (("discountType" = 'PERCENTAGE' AND "discountPercentageBps" BETWEEN 0 AND 10000 AND "discountValueCents" IS NULL) OR ("discountType" = 'FIXED_AMOUNT' AND "discountValueCents" >= 0 AND "discountPercentageBps" IS NULL)),
  CONSTRAINT "Offer_exactly_one_scope" CHECK ((("productId" IS NOT NULL)::integer + ("laboratoryId" IS NOT NULL)::integer + ("categoryId" IS NOT NULL)::integer + ("productType" IS NOT NULL)::integer) = 1)
);
CREATE TABLE "InventoryLot" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "lotNumber" TEXT NOT NULL, "expirationDate" TIMESTAMP(3) NOT NULL, "quantity" INTEGER NOT NULL, "warehouseLocation" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE ("productId", "lotNumber"), CONSTRAINT "InventoryLot_quantity_nonnegative" CHECK ("quantity" >= 0)
);
CREATE TABLE "Order" (
  "id" TEXT PRIMARY KEY, "folio" TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "clientName" TEXT, "clientEmail" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_REVIEW', "subtotalCents" INTEGER NOT NULL, "discountTotalCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL, "deliveryAddress" TEXT, "deliveryCity" TEXT, "deliveryState" TEXT, "deliveryPostalCode" TEXT,
  "billingBusinessName" TEXT, "billingRfc" TEXT, "billingAddress" TEXT, "responsibleName" TEXT, "responsiblePhone" TEXT,
  "observations" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_money_consistent" CHECK ("subtotalCents" >= 0 AND "discountTotalCents" >= 0 AND "totalCents" >= 0 AND "discountTotalCents" <= "subtotalCents" AND "totalCents" = "subtotalCents" - "discountTotalCents")
);
CREATE TABLE "OrderItem" (
  "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "sku" TEXT NOT NULL,
  "productName" TEXT NOT NULL, "laboratoryName" TEXT NOT NULL, "presentation" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
  "unitPriceCents" INTEGER NOT NULL, "originalUnitPriceCents" INTEGER NOT NULL DEFAULT 0, "discountAmountCents" INTEGER NOT NULL DEFAULT 0,
  "offerTitle" TEXT, "subtotalCents" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_money_consistent" CHECK ("quantity" > 0 AND "unitPriceCents" >= 0 AND "originalUnitPriceCents" >= 0 AND "discountAmountCents" >= 0 AND "discountAmountCents" <= "originalUnitPriceCents" AND "unitPriceCents" = "originalUnitPriceCents" - "discountAmountCents" AND "subtotalCents" = "unitPriceCents" * "quantity")
);
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY, "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "action" TEXT NOT NULL, "entity" TEXT NOT NULL, "entityId" TEXT NOT NULL, "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Session" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "sessionTokenHash" TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMP(3) NOT NULL, "userAgent" TEXT, "ipAddress" TEXT,
  "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ImportBatch" (
  "id" TEXT PRIMARY KEY, "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "type" TEXT NOT NULL, "filename" TEXT, "status" TEXT NOT NULL DEFAULT 'PENDING', "totalRows" INTEGER NOT NULL DEFAULT 0,
  "validRows" INTEGER NOT NULL DEFAULT 0, "errorRows" INTEGER NOT NULL DEFAULT 0, "createdRows" INTEGER NOT NULL DEFAULT 0,
  "updatedRows" INTEGER NOT NULL DEFAULT 0, "errorsJson" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3), CONSTRAINT "ImportBatch_counts_nonnegative" CHECK ("totalRows" >= 0 AND "validRows" >= 0 AND "errorRows" >= 0 AND "createdRows" >= 0 AND "updatedRows" >= 0)
);
CREATE TABLE "OrderFolioSequence" ("year" INTEGER PRIMARY KEY, "nextValue" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "OrderFolioSequence_nonnegative" CHECK ("nextValue" >= 0));

CREATE INDEX "Customer_rfc_idx" ON "Customer"("rfc");
CREATE INDEX "Customer_isAuthorized_idx" ON "Customer"("isAuthorized");
CREATE INDEX "Product_laboratoryId_idx" ON "Product"("laboratoryId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_commercialName_idx" ON "Product"("commercialName");
CREATE INDEX "Product_productType_idx" ON "Product"("productType");
CREATE INDEX "Product_healthFraction_idx" ON "Product"("healthFraction");
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX "Product_stock_idx" ON "Product"("stock");
CREATE INDEX "Offer_isActive_startsAt_endsAt_idx" ON "Offer"("isActive", "startsAt", "endsAt");
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");
CREATE INDEX "Offer_laboratoryId_idx" ON "Offer"("laboratoryId");
CREATE INDEX "Offer_categoryId_idx" ON "Offer"("categoryId");
CREATE INDEX "Offer_productType_idx" ON "Offer"("productType");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "ImportBatch_userId_createdAt_idx" ON "ImportBatch"("userId", "createdAt");
CREATE INDEX "ImportBatch_status_createdAt_idx" ON "ImportBatch"("status", "createdAt");
