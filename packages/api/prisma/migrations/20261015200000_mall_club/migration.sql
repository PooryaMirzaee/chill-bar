-- AlterEnum PaymentMethod
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'WALLET';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CREDIT';

CREATE TYPE "OrderFulfillment" AS ENUM ('COUNTER', 'MALL_DELIVERY');
CREATE TYPE "MallDeliveryStatus" AS ENUM ('NONE', 'QUEUED', 'OUT', 'HANDED');
CREATE TYPE "MallMembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "MallWalletEntryType" AS ENUM ('TOPUP', 'ORDER_PAY', 'ADJUST', 'REFUND', 'BONUS');
CREATE TYPE "MallCreditEntryType" AS ENUM ('CHARGE', 'SETTLE', 'ADJUST');
CREATE TYPE "MallInvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID');

CREATE TABLE "MallComplex" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MallComplex_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MallUnit" (
    "id" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT,
    "category" TEXT,
    "usage" TEXT,
    "managerName" TEXT,
    "managerPhone" TEXT,
    "unitPhone" TEXT,
    "ownerName" TEXT,
    "ownerPhone" TEXT,
    "tenantName" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MallUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MallMembership" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" "MallMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "discountPercent" INTEGER NOT NULL DEFAULT 10,
    "walletBalance" INTEGER NOT NULL DEFAULT 0,
    "creditLimit" INTEGER NOT NULL DEFAULT 0,
    "creditUsed" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "customerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MallMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MallWalletLedger" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "type" "MallWalletEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "orderId" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MallWalletLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MallCreditLedger" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "type" "MallCreditEntryType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "creditUsedAfter" INTEGER NOT NULL,
    "orderId" TEXT,
    "invoiceId" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MallCreditLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MallInvoice" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" "MallInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MallInvoice_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD COLUMN "membershipId" TEXT;
ALTER TABLE "Order" ADD COLUMN "fulfillment" "OrderFulfillment" NOT NULL DEFAULT 'COUNTER';
ALTER TABLE "Order" ADD COLUMN "deliveryUnitId" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryLabel" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryStatus" "MallDeliveryStatus" NOT NULL DEFAULT 'NONE';

CREATE UNIQUE INDEX "MallComplex_slug_key" ON "MallComplex"("slug");
CREATE UNIQUE INDEX "MallUnit_complexId_unitCode_key" ON "MallUnit"("complexId", "unitCode");
CREATE INDEX "MallUnit_complexId_idx" ON "MallUnit"("complexId");
CREATE INDEX "MallUnit_floor_idx" ON "MallUnit"("floor");
CREATE INDEX "MallUnit_isActive_idx" ON "MallUnit"("isActive");
CREATE UNIQUE INDEX "MallMembership_code_key" ON "MallMembership"("code");
CREATE UNIQUE INDEX "MallMembership_unitId_key" ON "MallMembership"("unitId");
CREATE INDEX "MallMembership_status_idx" ON "MallMembership"("status");
CREATE INDEX "MallMembership_customerId_idx" ON "MallMembership"("customerId");
CREATE INDEX "MallWalletLedger_membershipId_createdAt_idx" ON "MallWalletLedger"("membershipId", "createdAt");
CREATE INDEX "MallWalletLedger_orderId_idx" ON "MallWalletLedger"("orderId");
CREATE INDEX "MallCreditLedger_membershipId_createdAt_idx" ON "MallCreditLedger"("membershipId", "createdAt");
CREATE INDEX "MallCreditLedger_orderId_idx" ON "MallCreditLedger"("orderId");
CREATE INDEX "MallCreditLedger_invoiceId_idx" ON "MallCreditLedger"("invoiceId");
CREATE UNIQUE INDEX "MallInvoice_membershipId_periodKey_key" ON "MallInvoice"("membershipId", "periodKey");
CREATE INDEX "MallInvoice_periodKey_status_idx" ON "MallInvoice"("periodKey", "status");
CREATE INDEX "Order_membershipId_idx" ON "Order"("membershipId");
CREATE INDEX "Order_fulfillment_deliveryStatus_idx" ON "Order"("fulfillment", "deliveryStatus");

ALTER TABLE "MallUnit" ADD CONSTRAINT "MallUnit_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "MallComplex"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MallMembership" ADD CONSTRAINT "MallMembership_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "MallUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MallWalletLedger" ADD CONSTRAINT "MallWalletLedger_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "MallMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MallWalletLedger" ADD CONSTRAINT "MallWalletLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MallCreditLedger" ADD CONSTRAINT "MallCreditLedger_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "MallMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MallCreditLedger" ADD CONSTRAINT "MallCreditLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MallCreditLedger" ADD CONSTRAINT "MallCreditLedger_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "MallInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MallInvoice" ADD CONSTRAINT "MallInvoice_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "MallMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "MallMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryUnitId_fkey" FOREIGN KEY ("deliveryUnitId") REFERENCES "MallUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
