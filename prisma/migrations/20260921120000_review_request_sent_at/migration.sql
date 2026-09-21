-- When the review request email actually went out, so the one reminder is
-- timed from the send rather than from delivery. Additive and nullable: every
-- existing order simply has not been asked yet. See src/services/order-reviews.ts.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "reviewRequestedAt" TIMESTAMP(3);
