import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/logo";

export default function robots(): MetadataRoute.Robots {
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
          // Temporary logo chooser; removed once a logo is picked.
          "/logo",
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
