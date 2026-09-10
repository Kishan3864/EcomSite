"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/admin/client";
import { PRODUCT_STATUSES, type ProductStatusValue } from "./product-schema";
import { Form } from "@/components/ui/form";

/**
 * Row selection for the products list. The table itself is server-rendered;
 * only the checkboxes and the action bar are client components, sharing one
 * selection through context. Submitting posts the selected ids to a server
 * action as repeated `ids` fields.
 */

interface Selection {
  selected: ReadonlySet<string>;
  toggle: (id: string, on: boolean) => void;
  setMany: (ids: string[], on: boolean) => void;
  clear: () => void;
}

const SelectionContext = createContext<Selection | null>(null);

function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("Bulk selection components must be rendered inside <BulkProvider>.");
  return ctx;
}

export function BulkProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  const value = useMemo<Selection>(
    () => ({
      selected,
      toggle: (id, on) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (on) next.add(id);
          else next.delete(id);
          return next;
        }),
      setMany: (ids, on) =>
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) {
            if (on) next.add(id);
            else next.delete(id);
          }
          return next;
        }),
      clear: () => setSelected(new Set()),
    }),
    [selected],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

const checkboxCls = "h-4 w-4 cursor-pointer rounded border-ink-300 accent-[var(--color-brand-700)]";

export function RowCheckbox({ id, label }: { id: string; label: string }) {
  const { selected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      checked={selected.has(id)}
      onChange={(e) => toggle(id, e.target.checked)}
      aria-label={`Select ${label}`}
      className={checkboxCls}
    />
  );
}

export function SelectAllCheckbox({ ids }: { ids: string[] }) {
  const { selected, setMany } = useSelection();
  const allOn = ids.length > 0 && ids.every((id) => selected.has(id));
  const someOn = !allOn && ids.some((id) => selected.has(id));
  return (
    <input
      type="checkbox"
      checked={allOn}
      ref={(el) => {
        if (el) el.indeterminate = someOn;
      }}
      onChange={(e) => setMany(ids, e.target.checked)}
      aria-label="Select all products on this page"
      disabled={ids.length === 0}
      className={checkboxCls}
    />
  );
}

const STATUS_VERB: Record<ProductStatusValue, string> = {
  ACTIVE: "Make active",
  DRAFT: "Set to draft",
  ARCHIVED: "Archive",
};

export function BulkBar({
  action,
  returnTo,
}: {
  action: (formData: FormData) => void | Promise<void>;
  returnTo: string;
}) {
  const { selected, clear } = useSelection();
  const [status, setStatus] = useState<ProductStatusValue>("ACTIVE");
  const count = selected.size;
  if (count === 0) return null;

  return (
    <Form
      action={action}
      className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-[13px] text-brand-900"
      onSubmit={(e) => {
        const label = STATUS_VERB[status].toLowerCase();
        if (!window.confirm(`${STATUS_VERB[status]} for ${count} selected ${count === 1 ? "product" : "products"}? (${label})`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <CheckSquare size={15} className="shrink-0" />
      <span className="font-medium tabular-nums">
        {count} selected
      </span>
      <span className="mx-1 hidden h-4 w-px bg-brand-200 sm:block" />
      <label className="flex items-center gap-2">
        <span className="text-[12.5px] text-brand-800">Set status to</span>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductStatusValue)}
          className="h-8 rounded-md border border-brand-200 bg-surface px-2 text-[12.5px] text-ink-900 outline-none focus:border-brand-500"
          aria-label="Bulk status"
        >
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "ACTIVE" ? "Active" : s === "DRAFT" ? "Draft" : "Archived"}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton size="xs" pendingText="Applying…">
        Apply
      </SubmitButton>
      <Button type="button" variant="ghost" size="xs" onClick={clear} className="ml-auto">
        <X size={13} /> Clear
      </Button>
    </Form>
  );
}
