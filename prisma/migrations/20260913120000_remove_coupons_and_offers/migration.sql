-- DropForeignKey
ALTER TABLE "Offer" DROP CONSTRAINT "Offer_categoryId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "couponCode",
DROP COLUMN "couponDiscount";

-- DropTable
DROP TABLE "Offer";

-- DropEnum
DROP TYPE "OfferType";


-- Any banner still pointing at the offers page now points at the catalogue.
UPDATE "Banner" SET "href" = '/products' WHERE "href" LIKE '/offers%';
