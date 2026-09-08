"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

const LIMIT = 140;

/**
 * Title + body of a review, clipped to a couple of lines with a "Read more"
 * toggle so the moderation table stays scannable.
 */
export function ReviewExcerpt({ title, body, imageCount = 0 }: { title: string; body: string; imageCount?: number }) {
  const [open, setOpen] = useState(false);
  const long = body.length > LIMIT;
  const text = open || !long ? body : `${body.slice(0, LIMIT).trimEnd()}…`;

  return (
    <div className="min-w-[240px] max-w-[440px]">
      <p className="font-medium leading-snug text-ink-950">{title}</p>
      <p
        className={
          open
            ? "mt-0.5 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-600"
            : "mt-0.5 text-[12.5px] leading-relaxed text-ink-600"
        }
      >
        {text}
      </p>
      <div className="mt-1 flex items-center gap-3">
        {long && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-[12px] font-medium text-brand-700 hover:underline"
          >
            {open ? "Show less" : "Read more"}
          </button>
        )}
        {imageCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11.5px] text-ink-400">
            <ImageIcon size={12} /> {imageCount} {imageCount === 1 ? "photo" : "photos"}
          </span>
        )}
      </div>
    </div>
  );
}
