-- CreateTable
CREATE TABLE "SpinDraw" (
    "id" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinDraw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpinDraw_deviceKey_dayKey_idx" ON "SpinDraw"("deviceKey", "dayKey");

-- CreateIndex
CREATE INDEX "SpinDraw_createdAt_idx" ON "SpinDraw"("createdAt");
