-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'LINK');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedPhone" TEXT;

-- CreateTable
CREATE TABLE "PhoneOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "customerId" TEXT,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhoneOtp_phone_createdAt_idx" ON "PhoneOtp"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneOtp_ip_createdAt_idx" ON "PhoneOtp"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "PhoneOtp_createdAt_idx" ON "PhoneOtp"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_verifiedPhone_key" ON "Customer"("verifiedPhone");
