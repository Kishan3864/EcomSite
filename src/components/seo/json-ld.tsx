import type { Product } from "@/lib/types";
import type { Crumb } from "@/components/ui/primitives";
import { BRAND } from "@/components/brand/logo";
import { BUSINESS, isFilled } from "@/config/business";

/**
 * Structured data helpers.
 *
 * Each takes exactly the domain object the page already has, so when products
 * come from a database the emitted JSON-LD updates with no extra work.
 */

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Schema payloads are generated from our own typed data, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const a = BUSINESS.address;

  // Only emit address fields that have actually been filled in — a half-written
  // PostalAddress with placeholder text is worse for Google than none at all.
  const address = Object.fromEntries(
    Object.entries({
      "@type": "PostalAddress",
      streetAddress: [a.line1, a.line2].filter(isFilled).join(", "),
      addressLocality: a.city,
      addressRegion: a.state,
      postalCode: a.postalCode,
      addressCountry: a.countryCode,
    }).filter(([key, value]) => key === "@type" || isFilled(String(value))),
  );

  const sameAs = [
    BUSINESS.social.instagram,
    BUSINESS.social.facebook,
    BUSINESS.social.youtube,
  ].filter(isFilled);

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        name: BRAND.name,
        legalName: BRAND.legalName,
        url: BRAND.url,
        slogan: BRAND.tagline,
        description: BRAND.description,
        email: BRAND.supportEmail,
        telephone: BRAND.supportPhone,
        currenciesAccepted: "INR",
        areaServed: { "@type": "Country", name: "India" },
        ...(Object.keys(address).length > 1 ? { address } : {}),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: BRAND.supportEmail,
          telephone: BRAND.supportPhone,
          areaServed: "IN",
          availableLanguage: ["en", "hi"],
        },
        ...(sameAs.length > 0 ? { sameAs } : {}),
      }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: BRAND.name,
        url: BRAND.url,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BRAND.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${BRAND.url}${item.href}`,
        })),
      }}
    />
  );
}

export function ProductJsonLd({ product }: { product: Product }) {
  const availability =
    product.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.subtitle,
        sku: product.id.toUpperCase(),
        image: product.images.map((i) => i.url),
        brand: {
          "@type": "Brand",
          name: product.brandName ?? product.brandSlug,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: product.rating,
          reviewCount: product.reviewCount,
          bestRating: 5,
          worstRating: 1,
        },
        offers: {
          "@type": "Offer",
          url: `${BRAND.url}/p/${product.slug}`,
          priceCurrency: "INR",
          price: product.price,
          availability,
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: BRAND.name },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "IN",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: product.returnWindowDays,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/FreeReturn",
          },
        },
      }}
    />
  );
}

export function ItemListJsonLd({
  items,
  name,
}: {
  items: { slug: string; title: string }[];
  name: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        name,
        numberOfItems: items.length,
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.title,
          url: `${BRAND.url}/p/${item.slug}`,
        })),
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      }}
    />
  );
}
