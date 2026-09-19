-- How many times each product page was opened, per day. One signal of four in
-- the homepage ranking, and the smallest honest way to have it: a counter.
--
-- What is NOT here is the point: no visitor id, no IP address, no cookie, no
-- user agent, no referrer. A row says "this product, this day, this many
-- views" and nothing about who.
--
-- Additive only: one new table. No existing table or row is touched.

-- CreateTable
CREATE TABLE "ProductViewDaily" (
    "productId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductViewDaily_pkey" PRIMARY KEY ("productId","day")
);

-- CreateIndex
CREATE INDEX "ProductViewDaily_day_idx" ON "ProductViewDaily"("day");

-- AddForeignKey
ALTER TABLE "ProductViewDaily" ADD CONSTRAINT "ProductViewDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
