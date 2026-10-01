-- CreateTable
CREATE TABLE IF NOT EXISTS "SpinPrizeClaim" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "prizeLabel" TEXT NOT NULL,
    "prizeType" TEXT NOT NULL,
    "prizeEmoji" TEXT NOT NULL DEFAULT '🎁',
    "prizeSnapshot" JSONB NOT NULL DEFAULT '{}',
    "phone" TEXT NOT NULL,
    "deviceKey" TEXT,
    "dayKey" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "redeemedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpinPrizeClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SpinPrizeClaim_code_key" ON "SpinPrizeClaim"("code");
CREATE INDEX IF NOT EXISTS "SpinPrizeClaim_phone_dayKey_idx" ON "SpinPrizeClaim"("phone", "dayKey");
CREATE INDEX IF NOT EXISTS "SpinPrizeClaim_dayKey_idx" ON "SpinPrizeClaim"("dayKey");
CREATE INDEX IF NOT EXISTS "SpinPrizeClaim_prizeId_idx" ON "SpinPrizeClaim"("prizeId");
CREATE INDEX IF NOT EXISTS "SpinPrizeClaim_createdAt_idx" ON "SpinPrizeClaim"("createdAt");
