-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'GOOGLE', 'FACEBOOK');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'PASSWORD',
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferredPayment" "PaymentMethod",
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "upiId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_authProvider_providerId_key" ON "Customer"("authProvider", "providerId");

