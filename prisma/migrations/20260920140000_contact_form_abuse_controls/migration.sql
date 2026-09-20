-- CreateEnum
CREATE TYPE "ContactAbuseReason" AS ENUM ('COOLDOWN', 'DAILY_CAP', 'HONEYPOT', 'TOO_FAST', 'VALIDATION', 'LINK_SPAM', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ContactBlockKind" AS ENUM ('IP', 'EMAIL');

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "ContactAbuse" (
    "id" TEXT NOT NULL,
    "reason" "ContactAbuseReason" NOT NULL,
    "ip" TEXT,
    "email" TEXT,
    "deviceId" TEXT,
    "customerId" TEXT,
    "userAgent" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactAbuse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactBlock" (
    "id" TEXT NOT NULL,
    "kind" "ContactBlockKind" NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactAbuse_createdAt_idx" ON "ContactAbuse"("createdAt");

-- CreateIndex
CREATE INDEX "ContactAbuse_ip_createdAt_idx" ON "ContactAbuse"("ip", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactBlock_kind_value_key" ON "ContactBlock"("kind", "value");

-- CreateIndex
CREATE INDEX "ContactMessage_ip_createdAt_idx" ON "ContactMessage"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_email_createdAt_idx" ON "ContactMessage"("email", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_deviceId_createdAt_idx" ON "ContactMessage"("deviceId", "createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_customerId_createdAt_idx" ON "ContactMessage"("customerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

