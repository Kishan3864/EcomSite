-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "defaultHsnCode" TEXT,
ADD COLUMN     "defaultTaxRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "placeOfSupply" TEXT,
ADD COLUMN     "placeOfSupplyCode" TEXT,
ADD COLUMN     "sellerAddress" TEXT,
ADD COLUMN     "sellerGstin" TEXT,
ADD COLUMN     "sellerLegalName" TEXT,
ADD COLUMN     "sellerStateCode" TEXT;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "taxRate" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");


-- Backfill the invoice trail for orders raised before this table had one.
-- Numbering follows the Indian financial year (April to March) and the order
-- in which the orders were actually placed, so the sequence stays defensible.
WITH numbered AS (
  SELECT
    "id",
    to_char("placedAt", 'YYYY') AS cal_year,
    CASE WHEN EXTRACT(MONTH FROM "placedAt") >= 4
         THEN EXTRACT(YEAR FROM "placedAt")
         ELSE EXTRACT(YEAR FROM "placedAt") - 1 END AS fy_start,
    ROW_NUMBER() OVER (
      PARTITION BY CASE WHEN EXTRACT(MONTH FROM "placedAt") >= 4
                        THEN EXTRACT(YEAR FROM "placedAt")
                        ELSE EXTRACT(YEAR FROM "placedAt") - 1 END
      ORDER BY "placedAt", "id"
    ) AS seq
  FROM "Order"
  WHERE "invoiceNumber" IS NULL
)
UPDATE "Order" o
SET "invoiceNumber" = 'MYR/'
      || to_char(n.fy_start, 'FM0000') || '-'
      || to_char((n.fy_start + 1) % 100, 'FM00') || '/'
      || to_char(n.seq, 'FM000000'),
    "invoiceDate" = o."placedAt"
FROM numbered n
WHERE o."id" = n."id";
