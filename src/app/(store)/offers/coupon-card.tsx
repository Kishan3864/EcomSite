"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, Copy } from "lucide-react";
import type { Offer } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatINR } from "@/lib/utils";

const TYPE_LABEL: Record<Offer["type"], string> = {
  percent: "Percentage off",
  flat: "Flat discount",
  shipping: "Free shipping",
  bank: "Bank offer",
};

export function CouponCodeCard({ offer }: { offer: Offer }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  function copy() {
    navigator.clipboard?.writeText(offer.code);
    setCopied(true);
    toast({
      title: `${offer.code} copied`,
      description: "Paste it into the coupon box at checkout.",
      tone: "info",
    });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="relative flex flex-col overflow-hidden rounded-xl border border-hairline bg-surface"
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: offer.accent }} />

      {/* Perforation notches, so it reads as a physical coupon */}
      <span className="absolute -left-2 top-1/2 h-4 w-4 rounded-full bg-canvas" aria-hidden />
      <span className="absolute -right-2 top-1/2 h-4 w-4 rounded-full bg-canvas" aria-hidden />

      <div className="flex-1 p-5">
        <span
          className="inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
          style={{ backgroundColor: offer.accent }}
        >
          {TYPE_LABEL[offer.type]}
        </span>
        <h3 className="mt-3 text-[16px] font-semibold leading-snug text-ink-950">{offer.title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{offer.description}</p>

        <ul className="mt-4 space-y-1 text-[12px] text-ink-500">
          <li>Minimum order {formatINR(offer.minSpend)}</li>
          {offer.maxDiscount && <li>Maximum discount {formatINR(offer.maxDiscount)}</li>}
          <li>Valid until {formatDate(offer.expiresAt, "short")}</li>
          {offer.categorySlug && (
            <li>
              Applies to{" "}
              <Link
                href={`/c/${offer.categorySlug}`}
                className="font-medium text-brand-700 hover:underline"
              >
                {offer.categorySlug.replace(/-/g, " ")}
              </Link>{" "}
              only
            </li>
          )}
        </ul>
      </div>

      <div className="border-t border-dashed border-ink-300 p-4">
        <button
          onClick={copy}
          className="flex w-full items-center justify-between gap-3 rounded-lg bg-ink-50 px-4 py-3 transition-colors hover:bg-ink-100"
        >
          <code className="font-mono text-[14px] font-bold tracking-[0.08em] text-ink-950">
            {offer.code}
          </code>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-700">
            {copied ? (
              <>
                <Check size={13} /> Copied
              </>
            ) : (
              <>
                <Copy size={13} /> Copy
              </>
            )}
          </span>
        </button>
      </div>
    </motion.article>
  );
}
