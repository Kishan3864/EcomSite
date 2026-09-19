import type { Prisma } from "@/generated/prisma/client";

/**
 * What a shopper is allowed to see, in one place.
 *
 * A product is on the storefront only when it is ACTIVE itself AND its
 * category is active AND its subcategory is active. Hiding a category in the
 * admin therefore hides every collection and every product inside it, and
 * hiding one collection hides that collection's products — from the menu,
 * listings, search, the home page blocks, related products, the sitemap,
 * structured data, the product's own URL (which 404s) and the checkout.
 *
 * Every storefront read of `Product` builds its `where` with `visibleProducts()`. There is
 * no second copy of the rule: `scripts/check-visibility.ts` and the ESLint rule
 * in eslint.config.mjs both fail a storefront file that queries products
 * without it. The admin is exempt on purpose — hidden things stay visible and
 * editable there.
 *
 * Plain data and no imports beyond a type, so a "use server" module, a server
 * component and a tsx script can all share the one object.
 */
const VISIBLE_PRODUCT = {
  status: "ACTIVE",
  category: { isActive: true },
  subcategory: { isActive: true },
} as const satisfies Prisma.ProductWhereInput;

/**
 * The rule, combined with whatever else the caller is asking for.
 *
 * A function and an AND on purpose, and the constant above is not exported. A
 * spread loses to any later key of the same name: a listing that narrows by
 * `category: { slug }` silently replaced `category: { isActive: true }`, and a
 * hidden department's own listing went on showing its products — the check
 * script caught exactly that. ANDed, the caller's conditions are added to the
 * rule and can never stand in for it.
 */
export function visibleProducts(where?: Prisma.ProductWhereInput): Prisma.ProductWhereInput {
  return where && Object.keys(where).length > 0 ? { AND: [VISIBLE_PRODUCT, where] } : VISIBLE_PRODUCT;
}

/** The same rule for a category with its collections, for reads that list the taxonomy. */
export const VISIBLE_CATEGORY = { isActive: true } as const satisfies Prisma.CategoryWhereInput;
