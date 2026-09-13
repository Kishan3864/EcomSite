import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/logo";

/**
 * Anything that is not the live shop is closed to crawlers outright.
 *
 * The staging copy runs the same code against a different database on a
 * different hostname; indexed, it would compete with the real store and leak
 * unreleased work. The test is deliberately one-sided — only an APP_ENV that
 * is set and is not "production" blocks — so a production box that has never
 * heard of APP_ENV keeps behaving exactly as before.
 */
const isPreview = !!process.env.APP_ENV && process.env.APP_ENV !== "production";

export default function robots(): MetadataRoute.Robots {
  if (isPreview) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private, transactional and infinitely faceted URLs stay out of the index.
        disallow: [
          "/cart",
          "/checkout",
          "/checkout/",
          "/account",
          "/account/",
          "/order/",
          "/wishlist",
          "/search",
          "/*?*page=",
          "/*?*sort=",
          "/*?*brands=",
        ],
      },
    ],
    sitemap: `${BRAND.url}/sitemap.xml`,
    host: BRAND.url,
  };
}
