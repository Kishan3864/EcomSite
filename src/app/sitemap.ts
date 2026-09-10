import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/logo";
import { getAllCategoryPaths, getAllProductSlugs } from "@/services/catalog";
import { policies } from "@/data/policies";
import { missingRequiredFields } from "@/config/business";

/**
 * Generated from the same service layer the pages use, so a product added to
 * the database appears in the sitemap without anyone remembering to add it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND.url;
  const now = new Date();

  // The sitemap is built on every production build, which makes it the natural
  // place to shout about business facts that are still placeholders. Shipping
  // with these unfilled is what gets a payment application rejected.
  const missing = missingRequiredFields();
  if (missing.length > 0) {
    console.warn(
      `\n⚠  src/config/business.ts has ${missing.length} required field(s) still unset:\n` +
        missing.map((f) => `   · ${f}`).join("\n") +
        `\n   Fill these in before applying for online payment acceptance.\n`,
    );
  }

  const [productSlugs, categoryPaths] = await Promise.all([
    getAllProductSlugs(),
    getAllCategoryPaths(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = (
    [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/offers`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/track`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/register`, changeFrequency: "yearly", priority: 0.3 },
      { url: `${base}/forgot-password`, changeFrequency: "yearly", priority: 0.2 },
    ] satisfies Omit<MetadataRoute.Sitemap[number], "lastModified">[]
  ).map((entry) => ({ ...entry, lastModified: now }));

  const categoryRoutes: MetadataRoute.Sitemap = categoryPaths.map((path) => ({
    url:
      "subcategory" in path && path.subcategory
        ? `${base}/c/${path.category}/${path.subcategory}`
        : `${base}/c/${path.category}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: "subcategory" in path && path.subcategory ? 0.75 : 0.85,
  }));

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${base}/p/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // Policy pages stay indexable and carry a real priority. A reviewer checking
  // that the store publishes its terms should find them in search, not just in
  // the footer.
  const policyRoutes: MetadataRoute.Sitemap = policies.map((policy) => ({
    url: `${base}/legal/${policy.slug}`,
    lastModified: new Date(policy.updatedAt),
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...policyRoutes];
}
