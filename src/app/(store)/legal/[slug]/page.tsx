import type { Metadata } from "next";
import { CreditCard, FileText, Info, RotateCcw, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { ProsePage } from "@/components/content/prose-page";
import { policies, policyMap } from "@/data/policies";
import { BUSINESS } from "@/config/business";

type Params = Promise<{ slug: string }>;

const POLICY_ICONS: Record<string, LucideIcon> = {
  privacy: ShieldCheck,
  terms: FileText,
  refunds: RotateCcw,
  shipping: Truck,
  payments: CreditCard,
  disclaimer: Info,
};

export function generateStaticParams() {
  return policies.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const policy = policyMap.get(slug);
  if (!policy) return { title: "Not found" };

  return {
    title: policy.title,
    description: policy.description,
    alternates: { canonical: `/legal/${policy.slug}` },
    openGraph: {
      title: `${policy.title} · ${BUSINESS.brandName}`,
      description: policy.description,
      url: `/legal/${policy.slug}`,
    },
  };
}

export default async function LegalPage({ params }: { params: Params }) {
  const { slug } = await params;
  const policy = policyMap.get(slug);
  if (!policy) notFound();

  return (
    <ProsePage
      eyebrow={policy.eyebrow}
      title={policy.title}
      intro={policy.intro}
      updatedAt={policy.updatedAt}
      crumbs={[
        { name: "Home", href: "/" },
        { name: policy.title, href: `/legal/${policy.slug}` },
      ]}
      sections={policy.sections}
      related={policies
        .filter((p) => p.slug !== policy.slug)
        .map((p) => ({
          href: `/legal/${p.slug}`,
          title: p.title,
          description: p.description,
          icon: POLICY_ICONS[p.slug] ?? FileText,
        }))}
      footerNote={
        <>
          Still unclear about something? Email{" "}
          <a
            href={`mailto:${BUSINESS.supportEmail}`}
            className="font-semibold text-brand-700 hover:underline"
          >
            {BUSINESS.supportEmail}
          </a>{" "}
          or read the other policies below.
        </>
      }
    />
  );
}
