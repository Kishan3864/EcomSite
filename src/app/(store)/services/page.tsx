import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/content/prose-page";
import { servicesSections } from "@/data/policies";
import { BUSINESS } from "@/config/business";

/**
 * A plain statement of what this business actually does.
 *
 * This page exists because payment aggregators and Google look for it during
 * merchant review: it is where a reviewer confirms that the business model on
 * the website matches the category declared on the KYC application. Keep it
 * factual and keep it in step with `@/config/business`.
 */

export const metadata: Metadata = {
  title: "What we do",
  description: `${BUSINESS.brandName} is an online retail store selling ${BUSINESS.categoriesSold
    .join(", ")
    .toLowerCase()} across India. Here is exactly how we operate.`,
  alternates: { canonical: "/services" },
  openGraph: {
    title: `What we do · ${BUSINESS.brandName}`,
    description: `How ${BUSINESS.brandName} operates: what we sell, how orders are fulfilled, and where we deliver.`,
    url: "/services",
  },
};

export default function ServicesPage() {
  return (
    <ProsePage
      eyebrow="About the business"
      title="What we do"
      intro={`${BUSINESS.brandName} is an online retail store. We buy stock, hold it ourselves and ship it to customers across India under our own invoice. This page states plainly how that works.`}
      updatedAt={BUSINESS.policiesEffectiveFrom}
      crumbs={[
        { name: "Home", href: "/" },
        { name: "What we do", href: "/services" },
      ]}
      sections={servicesSections}
      footerNote={
        <>
          The commercial terms behind all of this are in our{" "}
          <Link href="/legal/terms" className="font-medium text-brand-700 hover:underline">
            terms of use
          </Link>
          ,{" "}
          <Link href="/legal/shipping" className="font-medium text-brand-700 hover:underline">
            shipping policy
          </Link>{" "}
          and{" "}
          <Link href="/legal/refunds" className="font-medium text-brand-700 hover:underline">
            refund policy
          </Link>
          . For anything else,{" "}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            talk to us
          </Link>
          .
        </>
      }
    />
  );
}
