-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'ONLINE';

-- CreateTable
CREATE TABLE "CustomerAvatar" (
    "customerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAvatar_pkey" PRIMARY KEY ("customerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAvatar_key_key" ON "CustomerAvatar"("key");

-- AddForeignKey
ALTER TABLE "CustomerAvatar" ADD CONSTRAINT "CustomerAvatar_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
