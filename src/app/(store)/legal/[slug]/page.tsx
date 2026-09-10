import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProsePage } from "@/components/content/prose-page";
import { policies, policyMap } from "@/data/policies";
import { BUSINESS } from "@/config/business";

type Params = Promise<{ slug: string }>;

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
      footerNote={
        <>
          Still unclear about something? Email{" "}
          <a
            href={`mailto:${BUSINESS.supportEmail}`}
            className="font-semibold text-brand-700 hover:underline"
          >
            {BUSINESS.supportEmail}
          </a>{" "}
          or read the other policies:{" "}
          {policies
            .filter((p) => p.slug !== policy.slug)
            .map((p, i, arr) => (
              <span key={p.slug}>
                <Link
                  href={`/legal/${p.slug}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {p.title.toLowerCase()}
                </Link>
                {i < arr.length - 1 ? ", " : "."}
              </span>
            ))}
        </>
      }
    />
  );
}
