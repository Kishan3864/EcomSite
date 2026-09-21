import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/primitives";
import { Gallery } from "@/components/product/gallery";
import { BuyBox } from "@/components/product/buy-box";
import { BundleSection } from "@/components/product/bundle";
import { QnaSection, ReviewsSection } from "@/components/product/reviews";
import { StickyBuyBar } from "@/components/product/sticky-buy-bar";
import { ProductRail } from "@/components/product/product-rail";
import { RecentlyViewed, TrackView } from "@/components/product/recently-viewed";
import { BreadcrumbJsonLd, ProductJsonLd } from "@/components/seo/json-ld";
import { toCardModel, toCardModels } from "@/lib/card";
import {
  getAllProductSlugs,
  getBrand,
  getBundle,
  getCategory,
  getProduct,
  getQuestions,
  getRelated,
  getReviews,
} from "@/services/catalog";
import { getPublicPaymentMethods } from "@/services/storefront-config";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };

  const brand = await getBrand(product.brandSlug);
  // What was written in the admin wins. The derived sentence is the fallback
  // for the catalogue that predates the two fields, and it names a price only
  // when there is one to name.
  // getBrand() knows active brands only, so a product under a switched-off
  // brand has none to name — and must not say "undefined" instead.
  const title = product.metaTitle ?? (brand ? `${product.title} — ${brand.name}` : product.title);
  const priced =
    product.price > 0 ? ` Buy ${product.title} online at ₹${product.price.toLocaleString("en-IN")}.` : "";
  const description =
    product.metaDescription ??
    `${product.subtitle}${priced} ${product.returnWindowDays}-day returns, ${product.warranty.toLowerCase()}.`;

  return {
    // A meta title written by hand already ends in the shop's name, so it must
    // not go through the layout's "%s · WeekendCart" template as well.
    title: product.metaTitle ? { absolute: product.metaTitle } : title,
    description,
    ...(product.tags.length > 0 ? { keywords: product.tags } : {}),
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/p/${product.slug}`,
      images: product.images.slice(0, 3).map((i) => ({ url: i.url, alt: i.alt })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [product.images[0].url],
    },
    other: {
      "product:price:amount": String(product.price),
      "product:price:currency": "INR",
    },
  };
}

/**
 * The head of a detail section, set the way the homepage bands are: a gold
 * rule and small caps, the name in the display face, and a rule under the pair.
 * It is a step smaller than a band title so that the product's own name — the
 * only h1 on the page — still outranks everything written about it.
 */
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="pb-3">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-2 font-display text-[22px] leading-[1.1] tracking-[-0.02em] text-ink-950 sm:mt-2.5 sm:text-[28px]">
        {title}
      </h2>
    </div>
  );
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [brand, category, reviews, questions, related, bundle, payments] = await Promise.all([
    getBrand(product.brandSlug),
    getCategory(product.categorySlug),
    getReviews(product.id),
    getQuestions(product.id),
    getRelated(product, 10),
    getBundle(product),
    // What a signed-out customer will actually be offered at the checkout, so
    // the buy box cannot promise a way to pay that the checkout then refuses.
    getPublicPaymentMethods(),
  ]);

  const subcategory = category?.subcategories.find((s) => s.slug === product.subcategorySlug);
  const card = toCardModel(product);

  const crumbs = [
    { name: "Home", href: "/" },
    ...(category ? [{ name: category.name, href: `/c/${category.slug}` }] : []),
    ...(category && subcategory
      ? [{ name: subcategory.name, href: `/c/${category.slug}/${subcategory.slug}` }]
      : []),
    { name: product.title, href: `/p/${product.slug}` },
  ];

  // Every word of these three is the policy as written. They are re-typeset
  // below, never trimmed — they are what a first-time buyer reads before
  // deciding whether this shop can be trusted with a card number.
  const policies = [
    {
      title: `${product.returnWindowDays}-day returns`,
      body: `Changed your mind? Return within ${product.returnWindowDays} days of delivery in original packaging. Pickup is free from every serviceable pincode and the refund starts within 48 hours of the item reaching our warehouse.`,
      href: "/legal/refunds",
      linkLabel: "Read the return policy",
    },
    {
      title: "Warranty",
      body: product.warranty,
      href: "/faq",
      linkLabel: "Warranty questions",
    },
    {
      title: "Shipping",
      body: product.freeShipping
        ? `Free standard delivery, dispatched within 24 hours and delivered in about ${product.deliveryDays} day${product.deliveryDays > 1 ? "s" : ""}. Express delivery available at checkout.`
        : `Standard delivery at ₹79, or free on orders above ₹999. Delivered in about ${product.deliveryDays} days.`,
      href: "/legal/shipping",
      linkLabel: "Shipping policy",
    },
  ];

  return (
    <>
      <ProductJsonLd product={product} />
      <BreadcrumbJsonLd items={crumbs} />
      <TrackView
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          image: product.images[0].url,
          price: product.price,
          mrp: product.mrp,
        }}
      />

      <div className="container-page py-3 sm:py-7">
        <Breadcrumbs items={crumbs} className="mb-3 sm:mb-6" />

        <div className="grid gap-4 sm:gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
          <div className="min-w-0 lg:sticky lg:top-[132px] lg:h-fit">
            <Gallery
              images={product.images}
              videoPoster={product.videoPoster}
              title={product.title}
            />
          </div>

          <div>
            <BuyBox
              product={product}
              brandName={brand?.name}
              payments={payments}
            />
            <div id="buy-box-sentinel" aria-hidden className="h-px" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="container-page">
        <div className="grid gap-8 pt-6 sm:gap-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
          <div className="space-y-8 sm:space-y-14">
            <section>
              <SectionHead eyebrow="In brief" title="Highlights" />
              {/* One bordered card, a soft rule between every point. */}
              <ul className="card card-divided mt-5 overflow-hidden">
                {product.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-3 px-4 py-3.5 text-[13.5px] leading-[1.5] text-ink-700 sm:px-5 sm:text-[14px]"
                  >
                    <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <Check size={12} strokeWidth={2.5} />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <SectionHead eyebrow="The long version" title="About this product" />
              <div className="mt-5 space-y-3.5 sm:space-y-4">
                {product.description.split("\n\n").map((para) => (
                  <p
                    key={para}
                    className="max-w-[46ch] text-[14px] leading-[1.6] text-ink-600 sm:text-[15px]"
                  >
                    {para}
                  </p>
                ))}
              </div>
              {brand && (
                <div className="card-muted mt-6 p-4 sm:mt-8 sm:p-5">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    About {brand.name}
                  </p>
                  <p className="mt-2 max-w-[46ch] text-[13.5px] leading-[1.6] text-ink-600">
                    {brand.tagline}. Based in {brand.origin}.
                  </p>
                  <Link
                    href={`/products?brands=${brand.slug}`}
                    className="tap group mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
                  >
                    See everything by {brand.name}
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              )}
            </section>

            <section id="specifications" className="scroll-mt-32">
              <SectionHead eyebrow="Every figure" title="Specifications" />
              <div className="mt-5 space-y-6 sm:space-y-8">
                {product.specifications.map((group) => (
                  <div key={group.group}>
                    <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      {group.group}
                    </h3>
                    {/* The row is 44px tall and no taller until it has to be:
                        a long value on a phone wraps and takes the height it
                        needs rather than being squeezed into a fixed column. */}
                    <dl className="detail-panel mt-2 px-4 sm:px-5">
                      {group.items.map((item) => (
                        <div
                          key={item.label}
                          className="table-row-line flex min-h-[44px] items-center justify-between gap-4 py-2.5"
                        >
                          <dt className="min-w-0 break-words text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                            {item.label}
                          </dt>
                          <dd className="min-w-0 break-words text-right text-[13.5px] tabular-nums text-ink-900">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>

            <ReviewsSection
              productId={product.id}
              reviews={reviews}
              rating={product.rating}
              reviewCount={product.reviewCount}
              breakdown={product.ratingBreakdown}
            />

            <QnaSection questions={questions} />
          </div>

          {/* Policy sidebar: each promise in its own bordered card. */}
          <aside className="min-w-0 lg:sticky lg:top-[132px] lg:h-fit">
            <div>
              <span className="eyebrow">Every order</span>
              <dl className="mt-4 space-y-3 sm:mt-5">
                {policies.map((item) => (
                  <div key={item.title} className="card p-4 sm:p-5">
                    <dt className="text-[11.5px] font-semibold uppercase tracking-[0.12em] tabular-nums text-ink-500">
                      {item.title}
                    </dt>
                    <dd>
                      <p className="mt-2 text-[13px] leading-[1.6] text-ink-600">{item.body}</p>
                      <Link
                        href={item.href}
                        className="tap group mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
                      >
                        {item.linkLabel}
                        <ChevronRight
                          size={13}
                          className="transition-transform duration-200 group-hover:translate-x-0.5"
                        />
                      </Link>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </div>

      <div className="container-page py-7 sm:py-12">
        <BundleSection anchor={card} extras={toCardModels(bundle)} />
      </div>

      <ProductRail
        eyebrow="You may also like"
        title="Related products"
        description={`More from ${subcategory?.name ?? category?.name ?? "this category"}.`}
        href={
          category && subcategory
            ? `/c/${category.slug}/${subcategory.slug}`
            : "/products"
        }
        products={toCardModels(related)}
      />

      <RecentlyViewed excludeId={product.id} />

      <StickyBuyBar product={card} />
    </>
  );
}
