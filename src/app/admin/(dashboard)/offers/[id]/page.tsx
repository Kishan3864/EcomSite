import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { Card, DateCell, KeyValue, PageHeader, Pill } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/client";
import { updateOffer } from "@/services/admin/offers-actions";
import { OfferForm } from "../offer-form";
import { OFFER_STATUS, OFFER_TYPE, offerStatus, toInputDateTime } from "../lib";

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("MANAGER");
  const { id } = await params;

  const [offer, categories] = await Promise.all([
    db.offer.findUnique({ where: { id }, include: { category: { select: { name: true } } } }),
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!offer) notFound();

  const now = new Date();
  const status = OFFER_STATUS[offerStatus(offer, now)];
  const action = updateOffer.bind(null, offer.id);
  const remaining = offer.usageLimit === null ? null : Math.max(0, offer.usageLimit - offer.usedCount);
  const usedPct = offer.usageLimit ? Math.min(100, Math.round((offer.usedCount / offer.usageLimit) * 100)) : 0;

  return (
    <div>
      <PageHeader
        title={offer.title}
        back={{ href: "/admin/offers", label: "Coupons & offers" }}
        meta={
          <>
            <Pill tone={status.tone} dot>
              {status.label}
            </Pill>
            <Pill tone={OFFER_TYPE[offer.type].tone}>{OFFER_TYPE[offer.type].label}</Pill>
            <span className="inline-flex items-center gap-1 font-mono text-[12.5px] font-semibold tracking-[0.06em] text-ink-600">
              {offer.code}
              <CopyButton value={offer.code} label="" />
            </span>
          </>
        }
        actions={
          <Link href="/offers" target="_blank" className={buttonClasses("outline", "sm")}>
            <ExternalLink size={14} /> View offers page
          </Link>
        }
      />
      <OfferForm
        action={action}
        categories={categories}
        initial={{
          code: offer.code,
          title: offer.title,
          description: offer.description,
          type: offer.type,
          value: String(offer.value),
          minSpend: String(offer.minSpend),
          maxDiscount: offer.maxDiscount === null ? "" : String(offer.maxDiscount),
          categoryId: offer.categoryId ?? "",
          accent: offer.accent,
          startsAt: toInputDateTime(offer.startsAt),
          expiresAt: toInputDateTime(offer.expiresAt),
          usageLimit: offer.usageLimit === null ? "" : String(offer.usageLimit),
          isActive: offer.isActive,
        }}
        aside={
          <Card title="Usage">
            <div className="mb-3">
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-display text-[24px] leading-none text-ink-950 tabular-nums">{offer.usedCount}</span>
                <span className="text-ink-500">{offer.usageLimit === null ? "no limit" : `of ${offer.usageLimit} redemptions`}</span>
              </div>
              {offer.usageLimit !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${usedPct}%` }} />
                </div>
              )}
            </div>
            <KeyValue
              rows={[
                ...(remaining !== null ? [{ label: "Remaining", value: <span className="tabular-nums">{remaining}</span> }] : []),
                { label: "Scope", value: offer.category?.name ?? "Sitewide" },
                { label: "Starts", value: <DateCell value={offer.startsAt} time /> },
                { label: "Expires", value: <DateCell value={offer.expiresAt} time /> },
                { label: "Created", value: <DateCell value={offer.createdAt} /> },
                { label: "Updated", value: <DateCell value={offer.updatedAt} time /> },
              ]}
            />
            {offer.usedCount > 0 && (
              <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
                Redeemed codes cannot be deleted — deactivate this offer to stop further use.
              </p>
            )}
          </Card>
        }
      />
    </div>
  );
}
