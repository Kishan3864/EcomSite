import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/logo";
import { getAllCategoryPaths, getAllProductSlugs } from "@/services/catalog";
import { policies } from "@/data/policies";

/**
 * Generated from the same service layer the pages use, so a product added to
 * the database appears in the sitemap without anyone remembering to add it.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND.url;
  const now = new Date();

  const [productSlugs, categoryPaths] = await Promise.all([
    getAllProductSlugs(),
    getAllCategoryPaths(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = (
    [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/offers`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.6 },
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

  const policyRoutes: MetadataRoute.Sitemap = policies.map((policy) => ({
    url: `${base}/legal/${policy.slug}`,
    lastModified: new Date(policy.updatedAt),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...policyRoutes];
}
