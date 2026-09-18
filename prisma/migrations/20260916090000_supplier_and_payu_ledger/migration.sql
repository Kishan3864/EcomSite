-- Where a product was bought, and where the money went afterwards.
--
-- Two unrelated things land together because they are one deploy against a shop
-- that is taking real money, and every statement here is additive: new tables,
-- new enum, new nullable columns, new indexes. Nothing is dropped, nothing is
-- rewritten, no existing row is touched, and no column is made NOT NULL on a
-- table that already has rows in it. `Product.supplierId` in particular is
-- nullable on purpose — a hundred and twenty products predate anyone writing
-- their wholesaler down, and a required column could not be added to them.

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'REQUESTED', 'SUCCESS', 'FAILURE', 'OD_HIT');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "gstin" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "requestId" TEXT,
    "amount" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "failureReason" TEXT,
    "initiatedById" TEXT,
    "initiatedByName" TEXT NOT NULL,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "supplierId" TEXT;

-- AlterTable
ALTER TABLE "PaymentAttempt" ADD COLUMN "bankName" TEXT,
ADD COLUMN "cardMasked" TEXT,
ADD COLUMN "gatewayFee" INTEGER,
ADD COLUMN "gatewayFeeTax" INTEGER,
ADD COLUMN "settlementId" TEXT,
ADD COLUMN "settledAmount" INTEGER,
ADD COLUMN "utrNumber" TEXT,
ADD COLUMN "valueDate" TIMESTAMP(3),
ADD COLUMN "settlementSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_slug_key" ON "Supplier"("slug");

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "Supplier"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_token_key" ON "Refund"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_requestId_key" ON "Refund"("requestId");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Refund_paymentAttemptId_idx" ON "Refund"("paymentAttemptId");

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
