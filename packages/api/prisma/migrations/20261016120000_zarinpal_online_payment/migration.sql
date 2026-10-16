-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ONLINE';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OnlinePaymentPurpose" AS ENUM ('ORDER', 'WALLET_TOPUP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OnlinePaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "OnlinePayment" (
    "id" TEXT NOT NULL,
    "authority" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRT',
    "purpose" "OnlinePaymentPurpose" NOT NULL,
    "status" "OnlinePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "orderId" TEXT,
    "membershipId" TEXT,
    "customerId" TEXT,
    "refId" TEXT,
    "cardPan" TEXT,
    "fee" INTEGER,
    "metadata" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlinePayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OnlinePayment_authority_key" ON "OnlinePayment"("authority");
CREATE INDEX IF NOT EXISTS "OnlinePayment_status_createdAt_idx" ON "OnlinePayment"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "OnlinePayment_orderId_idx" ON "OnlinePayment"("orderId");
CREATE INDEX IF NOT EXISTS "OnlinePayment_membershipId_idx" ON "OnlinePayment"("membershipId");
CREATE INDEX IF NOT EXISTS "OnlinePayment_customerId_idx" ON "OnlinePayment"("customerId");

DO $$ BEGIN
  ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "MallMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "OnlinePayment" ADD CONSTRAINT "OnlinePayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
