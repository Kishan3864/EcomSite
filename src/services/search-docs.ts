import "server-only";

import { cache } from "react";
import type { SearchDoc } from "@/lib/search-index";
import { db } from "@/lib/db";

/**
 * Builds the header autocomplete index from the database.
 *
 * Only a handful of fields per product cross to the client, inside the RSC
 * payload the page already sends — about 12KB compressed for autocomplete that
 * answers without a network round-trip. If the catalogue grows past a few
 * hundred products, move this behind a debounced fetch instead.
 */
export const getSearchDocs = cache(async (): Promise<SearchDoc[]> => {
  const [categories, brands, products] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { subcategories: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    }),
    db.brand.findMany({ where: { isActive: true } }),
    db.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        title: true,
        subtitle: true,
        slug: true,
        tags: true,
        colors: true,
        price: true,
        rating: true,
        brand: { select: { name: true } },
        subcategory: { select: { slug: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      },
    }),
  ]);

  const docs: SearchDoc[] = [];

  for (const c of categories) {
    docs.push({
      k: `${c.name} ${c.menuLabel}`.toLowerCase(),
      w: 3,
      hit: { type: "category", label: c.name, sublabel: "Browse category", href: `/c/${c.slug}` },
    });
    for (const s of c.subcategories) {
      docs.push({
        k: `${s.name} ${c.name}`.toLowerCase(),
        w: 2.5,
        hit: { type: "category", label: s.name, sublabel: `in ${c.name}`, href: `/c/${c.slug}/${s.slug}` },
      });
    }
  }

  for (const b of brands) {
    docs.push({
      k: `${b.name} ${b.tagline}`.toLowerCase(),
      w: 2,
      hit: { type: "brand", label: b.name, sublabel: b.tagline, href: `/products?brands=${b.slug}` },
    });
  }

  for (const p of products) {
    docs.push({
      k: `${p.title} ${p.subtitle} ${p.tags.join(" ")} ${p.brand.name} ${p.subcategory.slug} ${p.colors.join(" ")}`.toLowerCase(),
      w: 1 + Math.min(1.4, p.rating / 4),
      hit: {
        type: "product",
        label: p.title,
        sublabel: p.brand.name,
        href: `/p/${p.slug}`,
        image: p.images[0]?.url,
        price: p.price,
      },
    });
  }

  return docs;
});
