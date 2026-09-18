-- What a product cost to buy, and a page headline that can say more than the
-- title.
--
-- Additive only: two nullable columns on Product, no default and no backfill.
-- No existing row is touched and nothing is dropped or rewritten. Both stay
-- null on every product that predates them, and null is a legitimate answer
-- for each — "not recorded" for the cost, "use the title" for the headline.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "costPrice" INTEGER,
ADD COLUMN "headline" TEXT;
