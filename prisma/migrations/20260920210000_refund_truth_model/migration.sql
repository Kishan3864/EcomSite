-- AlterEnum
-- IF NOT EXISTS so a re-run is harmless, matching the VERIFYING migration.
-- The new value is not used anywhere in this migration, which is what keeps
-- ADD VALUE safe inside the transaction Prisma wraps around it.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_DUE' BEFORE 'REFUNDED';

-- AlterTable
ALTER TABLE "ReturnRequest" ADD COLUMN     "refundId" TEXT;

-- CreateTable
CREATE TABLE "ManualRefund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "recordedById" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManualRefund_orderId_recordedAt_idx" ON "ManualRefund"("orderId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnRequest_refundId_key" ON "ReturnRequest"("refundId");

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualRefund" ADD CONSTRAINT "ManualRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualRefund" ADD CONSTRAINT "ManualRefund_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

