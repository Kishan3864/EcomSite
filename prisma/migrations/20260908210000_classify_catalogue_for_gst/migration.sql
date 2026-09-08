-- Classify the catalogue for GST. HSN chapters and rates are the ones the
-- seed uses, applied here as well so a shop that was seeded before these
-- columns existed does not print an invoice with a blank HSN column.

-- Category defaults.
UPDATE "Category" SET "defaultHsnCode" = '8517', "defaultTaxRate" = 18 WHERE "slug" = 'electronics' AND "defaultHsnCode" IS NULL;
UPDATE "Category" SET "defaultHsnCode" = '6204', "defaultTaxRate" = 12 WHERE "slug" = 'fashion' AND "defaultHsnCode" IS NULL;
UPDATE "Category" SET "defaultHsnCode" = '9403', "defaultTaxRate" = 18 WHERE "slug" = 'home-living' AND "defaultHsnCode" IS NULL;
UPDATE "Category" SET "defaultHsnCode" = '7323', "defaultTaxRate" = 12 WHERE "slug" = 'kitchen' AND "defaultHsnCode" IS NULL;
UPDATE "Category" SET "defaultHsnCode" = '3304', "defaultTaxRate" = 18 WHERE "slug" = 'beauty' AND "defaultHsnCode" IS NULL;
UPDATE "Category" SET "defaultHsnCode" = '7113', "defaultTaxRate" = 3 WHERE "slug" = 'jewellery' AND "defaultHsnCode" IS NULL;
UPDATE "Category" SET "defaultHsnCode" = '9506', "defaultTaxRate" = 18 WHERE "slug" = 'sports' AND "defaultHsnCode" IS NULL;
UPDATE "Category" SET "defaultHsnCode" = '4901', "defaultTaxRate" = 0 WHERE "slug" = 'books' AND "defaultHsnCode" IS NULL;

-- Subcategories that sit in a different chapter from their category.
UPDATE "Product" p SET "hsnCode" = '8471', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'electronics' AND s."slug" = 'laptops' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '8518', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'electronics' AND s."slug" = 'audio' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '8525', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'electronics' AND s."slug" = 'cameras' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '6205', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'fashion' AND s."slug" = 'men' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '6403', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'fashion' AND s."slug" = 'footwear' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '4202', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'fashion' AND s."slug" = 'bags' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '9102', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'fashion' AND s."slug" = 'watches' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '9405', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'home-living' AND s."slug" = 'decor' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '6302', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'home-living' AND s."slug" = 'bedding' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '5702', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'home-living' AND s."slug" = 'rugs' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '8509', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'kitchen' AND s."slug" = 'appliances' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '6912', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'kitchen' AND s."slug" = 'dining' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '3305', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'beauty' AND s."slug" = 'haircare' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '3303', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'beauty' AND s."slug" = 'fragrance' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '2106', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'beauty' AND s."slug" = 'wellness' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '4202', "taxRate" = 18 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'sports' AND s."slug" = 'outdoor' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '6109', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'sports' AND s."slug" = 'activewear' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '4820', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'books' AND s."slug" = 'stationery' AND p."hsnCode" IS NULL;
UPDATE "Product" p SET "hsnCode" = '4820', "taxRate" = 12 FROM "Subcategory" s, "Category" c WHERE p."subcategoryId" = s."id" AND s."categoryId" = c."id" AND c."slug" = 'books' AND s."slug" = 'art' AND p."hsnCode" IS NULL;

-- The few products their subcategory still classifies wrongly.
UPDATE "Product" SET "hsnCode" = '5208', "taxRate" = 5 WHERE "slug" = 'loomcraft-kota-doria-saree';
UPDATE "Product" SET "hsnCode" = '6305', "taxRate" = 5 WHERE "slug" = 'loomcraft-jute-market-bag';
UPDATE "Product" SET "hsnCode" = '7009', "taxRate" = 18 WHERE "slug" = 'kavya-arched-wall-mirror';
UPDATE "Product" SET "hsnCode" = '4911', "taxRate" = 12 WHERE "slug" = 'kavya-block-print-wall-art';
UPDATE "Product" SET "hsnCode" = '6913', "taxRate" = 12 WHERE "slug" = 'studio-vayu-stoneware-vase';
UPDATE "Product" SET "hsnCode" = '6810', "taxRate" = 18 WHERE "slug" = 'studio-vayu-terrazzo-coasters';
UPDATE "Product" SET "hsnCode" = '7013', "taxRate" = 18 WHERE "slug" = 'studio-vayu-handblown-glasses';
UPDATE "Product" SET "hsnCode" = '7418', "taxRate" = 12 WHERE "slug" = 'copperleaf-brass-serving-platter';
UPDATE "Product" SET "hsnCode" = '7013', "taxRate" = 18 WHERE "slug" = 'copperleaf-airtight-jar-set';
UPDATE "Product" SET "hsnCode" = '4602', "taxRate" = 12 WHERE "slug" = 'studio-vayu-cane-basket-trio';
UPDATE "Product" SET "hsnCode" = '0902', "taxRate" = 5 WHERE "slug" = 'nirvaan-tulsi-green-tea';
UPDATE "Product" SET "hsnCode" = '7116', "taxRate" = 3 WHERE "slug" = 'studio-vayu-gua-sha-stone';
UPDATE "Product" SET "hsnCode" = '7117', "taxRate" = 3 WHERE "slug" = 'studio-vayu-brass-torque';
UPDATE "Product" SET "hsnCode" = '6306', "taxRate" = 12 WHERE "slug" = 'peak-pine-2p-trekking-tent';
UPDATE "Product" SET "hsnCode" = '9617', "taxRate" = 18 WHERE "slug" = 'peak-pine-insulated-bottle-1l';
UPDATE "Product" SET "hsnCode" = '9019', "taxRate" = 12 WHERE "slug" = 'peak-pine-massage-gun';
UPDATE "Product" SET "hsnCode" = '9608', "taxRate" = 18 WHERE "slug" = 'studio-vayu-brass-pen';
UPDATE "Product" SET "hsnCode" = '3213', "taxRate" = 18 WHERE "slug" = 'studio-vayu-watercolour-set';

-- Order lines already written are matched on the slug they snapshotted, not on
-- their product link: some demo lines carry an id that no longer names the
-- product they describe, and the slug is the field that still identifies it.
UPDATE "OrderLine" l
SET "hsnCode" = COALESCE(p."hsnCode", c."defaultHsnCode"),
    "taxRate" = COALESCE(p."taxRate", c."defaultTaxRate", 18)
FROM "Product" p
JOIN "Category" c ON c."id" = p."categoryId"
WHERE l."slug" = p."slug" AND l."hsnCode" IS NULL;
