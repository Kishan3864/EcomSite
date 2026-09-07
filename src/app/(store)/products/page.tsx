import type { Metadata } from "next";
import { ListingShell } from "@/components/listing/listing-shell";
import { toCardModels } from "@/lib/card";
import { parseQuery, type RawSearchParams } from "@/lib/query";
import { getBrands, searchProducts } from "@/services/catalog";

export const metadata: Metadata = {
  title: "All products",
  description:
    "Browse every product on Mayura — electronics, fashion, home, kitchen, beauty, jewellery, sport and books from 16 Indian studios.",
  alternates: { canonical: "/products" },
  openGraph: { title: "All products · Mayura", url: "/products" },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const query = parseQuery(params);
  const [result, brands] = await Promise.all([searchProducts(query), getBrands()]);

  const brandLabels = Object.fromEntries(brands.map((b) => [b.slug, b.name]));

  return (
    <ListingShell
      eyebrow="The full catalogue"
      title="All products"
      description="Every product we stock, in one place. Filter by price, brand, rating or discount to narrow it down."
      crumbs={[
        { name: "Home", href: "/" },
        { name: "All products", href: "/products" },
      ]}
      query={query}
      facets={result.facets}
      products={toCardModels(result.items)}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      basePath="/products"
      brandLabels={brandLabels}
      emptyVariant={query.q ? "no-results" : "no-products"}
    />
  );
}
