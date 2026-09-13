-- A product's packed weight, for the courier booking; when an order's tracking
-- was last pulled from the courier.
ALTER TABLE "Product" ADD COLUMN "weightGrams" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "Order" ADD COLUMN "trackingSyncedAt" TIMESTAMP(3);
