"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, ImageOff, Plus, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { inputCls, selectArrow, selectCls } from "@/components/admin/ui";
import {
  VARIANT_TYPES,
  type CatalogItem,
  type ImageInput,
  type SpecGroupInput,
  type VariantGroupInput,
  type VariantTypeValue,
} from "./product-schema";

/**
 * Dynamic sub-editors for the product form. Each keeps its own list in React
 * state and the form serialises it into a hidden JSON field on submit; the
 * server re-validates every row.
 */

const smallInput = cn(inputCls, "h-9 text-[13px]");
const smallSelect = cn(selectCls, "h-9 text-[13px]");
const rowBtn = "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-400";
const dangerBtn = "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600";

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function isUrlish(value: string) {
  return /^https?:\/\/\S+$/i.test(value) || (value.startsWith("/") && !value.startsWith("//"));
}

/* ------------------------------ Images ------------------------------ */

export function ImagesEditor({ value, onChange }: { value: ImageInput[]; onChange: (next: ImageInput[]) => void }) {
  const update = (i: number, patch: Partial<ImageInput>) => onChange(value.map((img, idx) => (idx === i ? { ...img, ...patch } : img)));

  return (
    <div className="grid gap-2.5">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-[12.5px] text-ink-500">
          No images yet. Paste an image URL below — the first image is the cover shown on cards.
        </p>
      )}
      {value.map((img, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-hairline bg-canvas p-2.5">
          {img.url && isUrlish(img.url) ? (
            <Image
              src={img.url}
              alt={img.alt || `Image ${i + 1}`}
              width={56}
              height={56}
              unoptimized
              className="h-14 w-14 shrink-0 rounded-md border border-hairline bg-surface object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-ink-200 bg-surface text-ink-300">
              <ImageOff size={16} />
            </span>
          )}
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <input
              value={img.url}
              onChange={(e) => update(i, { url: e.target.value })}
              placeholder="https://… image URL"
              aria-label={`Image ${i + 1} URL`}
              className={smallInput}
            />
            <input
              value={img.alt}
              onChange={(e) => update(i, { alt: e.target.value })}
              placeholder="Alt text (what the image shows)"
              aria-label={`Image ${i + 1} alt text`}
              className={smallInput}
            />
          </div>
          <div className="flex shrink-0 items-center">
            {i === 0 && <span className="mr-1 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-800">Cover</span>}
            <button type="button" onClick={() => onChange(move(value, i, i - 1))} disabled={i === 0} title="Move up" className={rowBtn}>
              <ArrowUp size={14} />
            </button>
            <button type="button" onClick={() => onChange(move(value, i, i + 1))} disabled={i === value.length - 1} title="Move down" className={rowBtn}>
              <ArrowDown size={14} />
            </button>
            <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} title="Remove image" className={dangerBtn}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="xs" onClick={() => onChange([...value, { url: "", alt: "" }])}>
          <Plus size={13} /> Add image
        </Button>
      </div>
    </div>
  );
}

/* --------------------------- Specifications ------------------------- */

export function SpecsEditor({ value, onChange }: { value: SpecGroupInput[]; onChange: (next: SpecGroupInput[]) => void }) {
  const updateGroup = (gi: number, patch: Partial<SpecGroupInput>) =>
    onChange(value.map((g, idx) => (idx === gi ? { ...g, ...patch } : g)));
  const updateItem = (gi: number, ii: number, patch: Partial<{ label: string; value: string }>) =>
    updateGroup(gi, { items: value[gi].items.map((it, idx) => (idx === ii ? { ...it, ...patch } : it)) });

  return (
    <div className="grid gap-3">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-[12.5px] text-ink-500">
          No specifications. Add a group such as “General” or “In the box”, then its rows.
        </p>
      )}
      {value.map((g, gi) => (
        <div key={gi} className="rounded-lg border border-hairline bg-canvas p-3">
          <div className="flex items-center gap-2">
            <input
              value={g.group}
              onChange={(e) => updateGroup(gi, { group: e.target.value })}
              placeholder="Group name, e.g. General"
              aria-label={`Specification group ${gi + 1} name`}
              className={cn(smallInput, "max-w-xs font-medium")}
            />
            <div className="ml-auto flex items-center">
              <button type="button" onClick={() => onChange(move(value, gi, gi - 1))} disabled={gi === 0} title="Move group up" className={rowBtn}>
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => onChange(move(value, gi, gi + 1))} disabled={gi === value.length - 1} title="Move group down" className={rowBtn}>
                <ArrowDown size={14} />
              </button>
              <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== gi))} title="Remove group" className={dangerBtn}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="mt-2.5 grid gap-1.5">
            {g.items.map((it, ii) => (
              <div key={ii} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] items-center gap-2">
                <input
                  value={it.label}
                  onChange={(e) => updateItem(gi, ii, { label: e.target.value })}
                  placeholder="Label"
                  aria-label={`Group ${gi + 1} row ${ii + 1} label`}
                  className={smallInput}
                />
                <input
                  value={it.value}
                  onChange={(e) => updateItem(gi, ii, { value: e.target.value })}
                  placeholder="Value"
                  aria-label={`Group ${gi + 1} row ${ii + 1} value`}
                  className={smallInput}
                />
                <button
                  type="button"
                  onClick={() => updateGroup(gi, { items: g.items.filter((_, idx) => idx !== ii) })}
                  title="Remove row"
                  className={dangerBtn}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <div>
              <Button type="button" variant="ghost" size="xs" onClick={() => updateGroup(gi, { items: [...g.items, { label: "", value: "" }] })}>
                <Plus size={13} /> Add row
              </Button>
            </div>
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="xs" onClick={() => onChange([...value, { group: "", items: [{ label: "", value: "" }] }])}>
          <Plus size={13} /> Add group
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Variants ---------------------------- */

const EMPTY_OPTION = { label: "", value: "", swatch: "", priceDelta: 0, inStock: true };

export function VariantsEditor({ value, onChange }: { value: VariantGroupInput[]; onChange: (next: VariantGroupInput[]) => void }) {
  const updateGroup = (gi: number, patch: Partial<VariantGroupInput>) =>
    onChange(value.map((g, idx) => (idx === gi ? { ...g, ...patch } : g)));
  const updateOption = (gi: number, oi: number, patch: Partial<VariantGroupInput["options"][number]>) =>
    updateGroup(gi, { options: value[gi].options.map((o, idx) => (idx === oi ? { ...o, ...patch } : o)) });

  return (
    <div className="grid gap-3">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-[12.5px] text-ink-500">
          No variants. Add a group when shoppers must pick a colour, size, storage or another option.
        </p>
      )}
      {value.map((g, gi) => {
        const isColor = g.type === "COLOR";
        return (
          <div key={gi} className="rounded-lg border border-hairline bg-canvas p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={g.name}
                onChange={(e) => updateGroup(gi, { name: e.target.value })}
                placeholder="Group name, e.g. Colour"
                aria-label={`Variant group ${gi + 1} name`}
                className={cn(smallInput, "max-w-xs font-medium")}
              />
              <select
                value={g.type}
                onChange={(e) => updateGroup(gi, { type: e.target.value as VariantTypeValue })}
                aria-label={`Variant group ${gi + 1} type`}
                className={cn(smallSelect, "w-36")}
                style={selectArrow}
              >
                {VARIANT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="ml-auto flex items-center">
                <button type="button" onClick={() => onChange(move(value, gi, gi - 1))} disabled={gi === 0} title="Move group up" className={rowBtn}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => onChange(move(value, gi, gi + 1))} disabled={gi === value.length - 1} title="Move group down" className={rowBtn}>
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== gi))} title="Remove group" className={dangerBtn}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-2.5 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                    <th className="pb-1.5 pr-2 font-semibold">Label</th>
                    <th className="pb-1.5 pr-2 font-semibold">Value</th>
                    <th className="pb-1.5 pr-2 font-semibold">{isColor ? "Swatch" : "Swatch / hint"}</th>
                    <th className="pb-1.5 pr-2 text-right font-semibold">± Price (₹)</th>
                    <th className="pb-1.5 pr-2 text-center font-semibold">In stock</th>
                    <th className="pb-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {g.options.map((o, oi) => (
                    <tr key={oi}>
                      <td className="py-1 pr-2">
                        <input
                          value={o.label}
                          onChange={(e) => updateOption(gi, oi, { label: e.target.value })}
                          placeholder="Midnight Blue"
                          aria-label={`Group ${gi + 1} option ${oi + 1} label`}
                          className={smallInput}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          value={o.value}
                          onChange={(e) => updateOption(gi, oi, { value: e.target.value })}
                          placeholder="auto from label"
                          aria-label={`Group ${gi + 1} option ${oi + 1} value`}
                          className={cn(smallInput, "font-mono text-[12px]")}
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          {isColor && (
                            <input
                              type="color"
                              value={/^#[0-9a-f]{6}$/i.test(o.swatch) ? o.swatch : "#888888"}
                              onChange={(e) => updateOption(gi, oi, { swatch: e.target.value })}
                              aria-label={`Group ${gi + 1} option ${oi + 1} swatch colour`}
                              className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-ink-200 bg-surface p-0.5"
                            />
                          )}
                          <input
                            value={o.swatch}
                            onChange={(e) => updateOption(gi, oi, { swatch: e.target.value })}
                            placeholder={isColor ? "#1f2a44" : "optional"}
                            aria-label={`Group ${gi + 1} option ${oi + 1} swatch`}
                            className={smallInput}
                          />
                        </div>
                      </td>
                      <td className="py-1 pr-2">
                        <input
                          type="number"
                          step={1}
                          value={o.priceDelta}
                          onChange={(e) => updateOption(gi, oi, { priceDelta: Math.trunc(Number(e.target.value) || 0) })}
                          aria-label={`Group ${gi + 1} option ${oi + 1} price difference`}
                          className={cn(smallInput, "w-28 text-right tabular-nums")}
                        />
                      </td>
                      <td className="py-1 pr-2 text-center">
                        <input
                          type="checkbox"
                          checked={o.inStock}
                          onChange={(e) => updateOption(gi, oi, { inStock: e.target.checked })}
                          aria-label={`Group ${gi + 1} option ${oi + 1} in stock`}
                          className="h-4 w-4 accent-[var(--color-brand-700)]"
                        />
                      </td>
                      <td className="py-1 text-right">
                        <button
                          type="button"
                          onClick={() => updateGroup(gi, { options: g.options.filter((_, idx) => idx !== oi) })}
                          title="Remove option"
                          className={dangerBtn}
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-1.5">
              <Button type="button" variant="ghost" size="xs" onClick={() => updateGroup(gi, { options: [...g.options, { ...EMPTY_OPTION }] })}>
                <Plus size={13} /> Add option
              </Button>
            </div>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onChange([...value, { name: "", type: value.length === 0 ? "COLOR" : "OPTION", options: [{ ...EMPTY_OPTION }] }])}
        >
          <Plus size={13} /> Add variant group
        </Button>
      </div>
    </div>
  );
}

/* --------------------------- Relation picker ------------------------ */

export function RelationPicker({
  name,
  catalog,
  value,
  onChange,
  exclude,
  max,
  placeholder = "Search by title or SKU…",
}: {
  name: string;
  catalog: CatalogItem[];
  value: string[];
  onChange: (next: string[]) => void;
  exclude?: string;
  max: number;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    const chosen = new Set(value);
    return catalog
      .filter((c) => c.id !== exclude && !chosen.has(c.id) && (c.title.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [catalog, exclude, q, value]);
  const full = value.length >= max;

  return (
    <div className="grid gap-2">
      {value.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const item = byId.get(id);
            return (
              <li key={id} className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface py-1 pl-3 pr-1.5 text-[12.5px] text-ink-900">
                <span className="max-w-[220px] truncate">{item?.title ?? "Unknown product"}</span>
                {item && <span className="font-mono text-[10.5px] text-ink-400">{item.sku}</span>}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== id))}
                  aria-label={`Remove ${item?.title ?? "product"}`}
                  className="rounded-full p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
                >
                  <X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[12.5px] text-ink-400">None selected.</p>
      )}
      <div className="relative">
        <div className={cn("flex h-9 items-center gap-2 rounded-lg border border-ink-200 bg-canvas px-3 focus-within:border-brand-500", full && "opacity-60")}>
          <Search size={14} className="shrink-0 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={full ? `Maximum of ${max} reached` : placeholder}
            disabled={full}
            aria-label={`Search products to add as ${name}`}
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-400"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-ink-400 hover:text-ink-700">
              <X size={13} />
            </button>
          )}
        </div>
        {q && !full && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-ink-200 bg-surface shadow-lg">
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-[12.5px] text-ink-500">No active products match “{query.trim()}”.</li>
            ) : (
              results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([...value, c.id]);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] text-ink-900 hover:bg-canvas"
                  >
                    <span className="truncate">{c.title}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-400">{c.sku}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
