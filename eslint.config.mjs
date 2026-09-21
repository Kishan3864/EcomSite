import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Every image goes through the wrapper, which hands remote photos to the
    // browser instead of the optimiser — this server cannot fetch them. A raw
    // next/image with a remote src would throw at render, since no remote host
    // is allowed through the optimiser.
    ignores: ["src/components/ui/image.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/image",
              message: 'Import Image from "@/components/ui/image" instead — see that file for why.',
            },
          ],
        },
      ],
    },
  },
  {
    // What a shopper may see is decided in ONE place: visibleProducts() in
    // src/services/visibility.ts — status, plus the active flag of the category
    // and the collection above the product. A storefront file that reads
    // products on its own would forget that rule and show a hidden department's
    // goods, so outside the admin only the files below may query products at
    // all, and scripts/check-visibility.ts proves each of their reads carries
    // the filter. The admin is exempt on purpose: hidden things stay editable.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/app/admin/**",
      "src/services/admin/**",
      "src/generated/**",
      "src/services/catalog.ts",
      "src/services/search-docs.ts",
      "src/services/commerce.ts",
      "src/services/cart-availability.ts",
      "src/services/home-ranking.ts",
      "src/services/order-reviews.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.property.name='product'][callee.property.name=/^(find|count|aggregate|groupBy)/]",
          message:
            "Storefront code must not query products directly. Go through src/services/catalog.ts, which applies visibleProducts() (see src/services/visibility.ts).",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
