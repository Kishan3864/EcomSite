import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, PackageCheck, RotateCcw, ShieldCheck } from "lucide-react";
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
  getOffers,
  getProduct,
  getQuestions,
  getRelated,
  getReviews,
} from "@/services/catalog";

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
  const title = `${product.title} — ${brand?.name}`;
  const description = `${product.subtitle} Buy ${product.title} online at ₹${product.price.toLocaleString("en-IN")}. ${product.returnWindowDays}-day returns, ${product.warranty.toLowerCase()}.`;

  return {
    title,
    description,
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

  const [brand, category, reviews, questions, related, bundle, offers] = await Promise.all([
    getBrand(product.brandSlug),
    getCategory(product.categorySlug),
    getReviews(product.id),
    getQuestions(product.id),
    getRelated(product, 10),
    getBundle(product),
    getOffers(),
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
          <div className="lg:sticky lg:top-[132px] lg:h-fit">
            <Gallery
              images={product.images}
              videoPoster={product.videoPoster}
              title={product.title}
            />
          </div>

          <div>
            <BuyBox product={product} brandName={brand?.name ?? product.brandSlug} offers={offers} />
            <div id="buy-box-sentinel" aria-hidden className="h-px" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="container-page">
        <div className="grid gap-6 border-t border-hairline pt-6 sm:gap-10 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
          <div className="space-y-6 sm:space-y-12">
            <section>
              <h2 className="font-display text-[18px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
                Highlights
              </h2>
              <ul className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-2.5">
                {product.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-2 text-[13.5px] text-ink-700 sm:gap-2.5 sm:text-[14px]"
                  >
                    <Check size={16} className="mt-0.5 shrink-0 text-brand-600" strokeWidth={2.5} />
                    {h}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-[18px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
                About this product
              </h2>
              <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
                {product.description.split("\n\n").map((para) => (
                  <p
                    key={para}
                    className="max-w-2xl text-[13.5px] leading-relaxed text-ink-600 sm:text-[14.5px]"
                  >
                    {para}
                  </p>
                ))}
              </div>
              {brand && (
                <p className="mt-4 rounded-xl border border-hairline bg-surface p-3.5 text-[13px] text-ink-600 sm:mt-5 sm:p-4 sm:text-[13.5px]">
                  <strong className="font-semibold text-ink-950">About {brand.name}</strong> —{" "}
                  {brand.tagline}. Based in {brand.origin}.{" "}
                  <Link
                    href={`/products?brands=${brand.slug}`}
                    className="font-semibold text-brand-700 underline-offset-4 hover:underline"
                  >
                    See everything by {brand.name}
                  </Link>
                </p>
              )}
            </section>

            <section id="specifications" className="scroll-mt-32">
              <h2 className="font-display text-[18px] tracking-[-0.02em] text-ink-950 sm:text-[28px]">
                Specifications
              </h2>
              <div className="mt-3 space-y-5 sm:mt-4 sm:space-y-6">
                {product.specifications.map((group) => (
                  <div key={group.group}>
                    <h3 className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500 sm:mb-2.5 sm:text-[12px]">
                      {group.group}
                    </h3>
                    {/* Phones split the row two to three, so a long value is
                        not squeezed into what a fixed label column leaves. */}
                    <dl className="overflow-hidden rounded-xl border border-hairline">
                      {group.items.map((item, i) => (
                        <div
                          key={item.label}
                          className={`grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-2.5 text-[13px] sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 sm:px-4 sm:py-3 sm:text-[13.5px] ${
                            i % 2 ? "bg-surface" : "bg-canvas"
                          }`}
                        >
                          <dt className="text-ink-500 max-lg:break-words">{item.label}</dt>
                          <dd className="text-ink-900 max-lg:break-words">{item.value}</dd>
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

          {/* Policy sidebar */}
          <aside className="space-y-3 sm:space-y-4 lg:sticky lg:top-[132px] lg:h-fit">
            {[
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
              {
                icon: PackageCheck,
                title: "Shipping",
                body: product.freeShipping
                  ? `Free standard delivery, dispatched within 24 hours and delivered in about ${product.deliveryDays} day${product.deliveryDays > 1 ? "s" : ""}. Express delivery available at checkout.`
                  : `Standard delivery at ₹79, or free on orders above ₹999. Delivered in about ${product.deliveryDays} days.`,
                href: "/legal/shipping",
                linkLabel: "Shipping policy",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-hairline bg-surface p-3.5 sm:p-4"
              >
                <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink-950 sm:text-[13.5px]">
                  <item.icon size={16} className="shrink-0 text-brand-600" />
                  {item.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-600 sm:mt-2">
                  {item.body}
                </p>
                <Link
                  href={item.href}
                  className="mt-2 inline-block text-[12.5px] font-semibold text-brand-700 underline-offset-4 hover:underline sm:mt-2.5"
                >
                  {item.linkLabel}
                </Link>
              </div>
            ))}
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
