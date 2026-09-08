-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "buyerGstin" TEXT;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "uqc" TEXT NOT NULL DEFAULT 'NOS';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "uqc" TEXT DEFAULT 'NOS';

