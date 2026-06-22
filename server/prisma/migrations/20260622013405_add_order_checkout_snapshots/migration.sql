-- AlterTable
ALTER TABLE "Order" ADD COLUMN "billingAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "billingBusinessName" TEXT;
ALTER TABLE "Order" ADD COLUMN "billingRfc" TEXT;
ALTER TABLE "Order" ADD COLUMN "clientEmail" TEXT;
ALTER TABLE "Order" ADD COLUMN "clientName" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryCity" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryPostalCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryState" TEXT;
ALTER TABLE "Order" ADD COLUMN "responsibleName" TEXT;
ALTER TABLE "Order" ADD COLUMN "responsiblePhone" TEXT;
