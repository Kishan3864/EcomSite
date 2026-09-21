import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumbs, SectionHeader } from "@/components/ui/primitives";
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

  // Every word of these three is the policy as written — re-typeset, never trimmed.
  const policies: {
    icon: LucideIcon;
    title: string;
    body: string;
    href: string;
    linkLabel: string;
  }[] = [
    {
      icon: Truck,
      title: "Shipping",
      body: product.freeShipping
        ? `Free standard delivery, dispatched within 24 hours and delivered in about ${product.deliveryDays} day${product.deliveryDays > 1 ? "s" : ""}. Express delivery available at checkout.`
        : `Standard delivery at ₹79, or free on orders above ₹999. Delivered in about ${product.deliveryDays} days.`,
      href: "/legal/shipping",
      linkLabel: "Shipping policy",
    },
    {
      icon: RotateCcw,
      title: `${product.returnWindowDays}-day returns`,
      body: `Changed your mind? Return within ${product.returnWindowDays} days of delivery in original packaging. Pickup is free from every serviceable pincode and the refund starts within 48 hours of the item reaching our warehouse.`,
      href: "/legal/refunds",
      linkLabel: "Read the return policy",
    },
    {
      icon: ShieldCheck,
      title: "Warranty",
      body: product.warranty,
      href: "/faq",
      linkLabel: "Warranty questions",
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

      {/* Hero: gallery and buy box */}
      <div className="container-page pb-4 pt-4 sm:pb-8 sm:pt-6">
        <Breadcrumbs items={crumbs} className="mb-4 sm:mb-6" />

        <div className="grid gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10 xl:gap-14">
          <div className="min-w-0 lg:sticky-under-header lg:self-start">
            <Gallery images={product.images} videoPoster={product.videoPoster} title={product.title} />
          </div>

          <div className="min-w-0">
            <BuyBox product={product} brandName={brand?.name} payments={payments} />
            <div id="buy-box-sentinel" aria-hidden className="h-px" />
          </div>
        </div>
      </div>

      {/* Delivery / returns / warranty */}
      <div className="container-page section-tight">
        <h2 className="sr-only">Delivery, returns and warranty</h2>
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {policies.map((item) => (
            <li key={item.title} className="card flex flex-col p-5">
              <div className="flex items-center gap-3">
                <span className="icon-tile">
                  <item.icon size={20} aria-hidden />
                </span>
                <h3 className="t-h3 tabular-nums">{item.title}</h3>
              </div>
              <p className="t-body mt-3 flex-1 text-[13px]">{item.body}</p>
              <Link
                href={item.href}
                className="group mt-4 inline-flex items-center gap-1 self-start rounded-full text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
              >
                {item.linkLabel}
                <ChevronRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Details */}
      <div className="container-page">
        <div className="space-y-10 pb-4 sm:space-y-14">
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
            <section aria-labelledby="highlights-heading" className="card p-5 sm:p-6">
              <p className="eyebrow">In brief</p>
              <h2 id="highlights-heading" className="t-h2 mt-2">Highlights</h2>
              <ul className="mt-5 space-y-3">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3 text-[14px] leading-[1.55] text-ink-700">
                    <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                      <Check size={14} aria-hidden />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="about-heading" className="card flex flex-col p-5 sm:p-6">
              <p className="eyebrow">The long version</p>
              <h2 id="about-heading" className="t-h2 mt-2">About this product</h2>
              <div className="mt-4 space-y-3.5">
                {product.description.split("\n\n").map((para) => (
                  <p key={para} className="t-body max-w-[68ch]">
                    {para}
                  </p>
                ))}
              </div>
              {brand && (
                <div className="card-muted mt-6 rounded-xl p-4">
                  <p className="t-label">About {brand.name}</p>
                  <p className="t-body mt-1.5 text-[13px]">
                    {brand.tagline}. Based in {brand.origin}.
                  </p>
                  <Link
                    href={`/products?brands=${brand.slug}`}
                    className="group mt-2.5 inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
                  >
                    See everything by {brand.name}
                    <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )}
            </section>
          </div>

          {product.specifications.length > 0 && (
            <section id="specifications" className="scroll-mt-32">
              <SectionHeader eyebrow="Every figure" title="Specifications" />
              <div className="card overflow-hidden">
                {product.specifications.map((group) => (
                  <div key={group.group} className="border-t border-line first:border-t-0">
                    <h3 className="t-label bg-ink-50/70 px-4 py-2.5 sm:px-6">{group.group}</h3>
                    {/* Two columns; a long value wraps rather than squeezing. */}
                    <dl className="divide-y divide-line">
                      {group.items.map((item) => (
                        <div
                          key={item.label}
                          className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:px-6"
                        >
                          <dt className="min-w-0 break-words text-[13px] text-ink-500">{item.label}</dt>
                          <dd className="min-w-0 break-words text-[13.5px] font-medium tabular-nums text-ink-900">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}

          <ReviewsSection
            productId={product.id}
            reviews={reviews}
            rating={product.rating}
            reviewCount={product.reviewCount}
            breakdown={product.ratingBreakdown}
          />

          <QnaSection questions={questions} />
        </div>
      </div>

      <div className="container-page section-tight">
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
