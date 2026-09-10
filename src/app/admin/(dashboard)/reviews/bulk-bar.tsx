"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, EyeOff } from "lucide-react";
import { PendingHint } from "@/components/admin/client";
import { buttonClasses } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

const RECOUNT_EVENT = "reviews:recount";

function boxes(formId: string) {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="ids"][form="${formId}"]`));
}

/**
 * Bulk approve / hide for the reviews table. Row checkboxes live inside the
 * table but point at this form via the `form` attribute, so the per-row
 * action forms stay un-nested. Selection is cleared whenever the URL changes
 * (a redirect after the action, a filter change).
 */
export function BulkBar({
  formId,
  action,
  returnTo,
}: {
  formId: string;
  action: (formData: FormData) => void | Promise<void>;
  returnTo: string;
}) {
  const [count, setCount] = useState(0);
  const key = useSearchParams().toString();

  // Subscribe to checkbox changes (the DOM is the source of truth for the
  // selection) and reset it whenever the URL changes — after an action's
  // redirect, or a filter/page change.
  useEffect(() => {
    const recount = () => setCount(boxes(formId).filter((b) => b.checked).length);
    document.addEventListener("change", recount);
    document.addEventListener(RECOUNT_EVENT, recount);

    for (const b of boxes(formId)) b.checked = false;
    const all = document.querySelector<HTMLInputElement>(`input[data-select-all="${formId}"]`);
    if (all) all.checked = false;
    document.dispatchEvent(new Event(RECOUNT_EVENT));

    return () => {
      document.removeEventListener("change", recount);
      document.removeEventListener(RECOUNT_EVENT, recount);
    };
  }, [formId, key]);

  return (
    <Form
      id={formId}
      action={action}
      className="ml-auto flex items-center gap-2"
      onSubmit={(e) => {
        if (count === 0) {
          e.preventDefault();
          return;
        }
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        if (submitter?.value === "hide") {
          const noun = count === 1 ? "review" : "reviews";
          if (
            !window.confirm(
              `Hide ${count} selected ${noun}? They disappear from the storefront and product ratings are recomputed.`,
            )
          ) {
            e.preventDefault();
          }
        }
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <span className="text-[12.5px] tabular-nums text-ink-500">
        {count === 0 ? "Select rows to bulk-moderate" : `${count} selected`}
      </span>
      <PendingHint text="Applying…" />
      <button type="submit" name="intent" value="approve" disabled={count === 0} className={buttonClasses("outline", "xs")}>
        <Check size={13} /> Approve
      </button>
      <button type="submit" name="intent" value="hide" disabled={count === 0} className={buttonClasses("outline", "xs")}>
        <EyeOff size={13} /> Hide
      </button>
    </Form>
  );
}

/** Header checkbox that (un)selects every row checkbox belonging to `formId`. */
export function SelectAllBox({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      data-select-all={formId}
      aria-label="Select all reviews on this page"
      className="h-4 w-4 cursor-pointer accent-[var(--color-brand-700)]"
      onChange={(e) => {
        for (const b of boxes(formId)) b.checked = e.target.checked;
        document.dispatchEvent(new Event(RECOUNT_EVENT));
      }}
    />
  );
}
