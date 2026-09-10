"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import {
  Baby,
  BookOpen,
  Car,
  ChefHat,
  Cpu,
  Dog,
  Dumbbell,
  Flower2,
  Gamepad2,
  Gem,
  Gift,
  Headphones,
  Heart,
  Home,
  ImageOff,
  Lamp,
  Laptop,
  Palette,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Sparkles,
  Tag,
  Watch,
  Wrench,
  type LucideProps,
} from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls, selectArrow, selectCls, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { GST_RATES } from "../products/product-schema";
import { Form } from "@/components/ui/form";

export interface CategoryFormValues {
  name: string;
  slug: string;
  menuLabel: string;
  icon: string;
  accent: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  highlights: string[];
  featuredBrandSlugs: string[];
  defaultHsnCode: string;
  defaultTaxRate: number | null;
  sortOrder: number | null;
  isActive: boolean;
}

export interface BrandOption {
  slug: string;
  name: string;
  isActive: boolean;
}

const MAX_HIGHLIGHTS = 4;
const HEX = /^#[0-9a-f]{6}$/i;
const DEFAULT_ACCENT = "#2c837c";

/**
 * A curated set of Lucide names a store owner is likely to want. Any Lucide
 * icon name is accepted (the server validates it); these just give a preview
 * without shipping the whole icon set to the browser.
 */
const SUGGESTED_ICONS: Record<string, React.ComponentType<LucideProps>> = {
  cpu: Cpu,
  smartphone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  shirt: Shirt,
  watch: Watch,
  "shopping-bag": ShoppingBag,
  sofa: Sofa,
  lamp: Lamp,
  home: Home,
  "chef-hat": ChefHat,
  sparkles: Sparkles,
  heart: Heart,
  gem: Gem,
  dumbbell: Dumbbell,
  "book-open": BookOpen,
  palette: Palette,
  "gamepad-2": Gamepad2,
  baby: Baby,
  dog: Dog,
  "flower-2": Flower2,
  gift: Gift,
  car: Car,
  wrench: Wrench,
  tag: Tag,
};

function looksLikeImage(value: string) {
  return /^https?:\/\/\S+$/i.test(value) || (value.startsWith("/") && !value.startsWith("//"));
}

const tidySlug = (v: string) => slugify(v).replace(/^-|-$/g, "");

export function CategoryForm({
  action,
  initial,
  brands,
  submitLabel = "Save category",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<CategoryFormValues>;
  brands: BrandOption[];
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const slugTouched = useRef(Boolean(initial?.slug));
  const [menuLabel, setMenuLabel] = useState(initial?.menuLabel ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "tag");
  const [accent, setAccent] = useState(initial?.accent ?? DEFAULT_ACCENT);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt ?? "");
  const [highlights, setHighlights] = useState((initial?.highlights ?? []).join("\n"));
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set(initial?.featuredBrandSlugs ?? []));

  const highlightCount = highlights.split("\n").filter((l) => l.trim()).length;
  const accentValid = HEX.test(accent);
  const previewAccent = accentValid ? accent : DEFAULT_ACCENT;
  const PreviewIcon = SUGGESTED_ICONS[icon.trim().toLowerCase()];
  const previewImage = looksLikeImage(imageUrl);

  // Featured brands are listed in the order they were ticked so the first
  // four in the mega menu are the ones the owner picked first.
  const orderedSelection = [...selectedBrands].filter((s) => brands.some((b) => b.slug === s));

  return (
    <Form action={formAction} className="grid gap-5">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}
      {state.error && state.field && (
        <Notice tone="error">Please fix the highlighted field below — {state.error}</Notice>
      )}

      <FormSection title="Identity" description="How the department is named in the menu, on its landing page and in URLs.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cat-name">Category name</Label>
            <input
              id="cat-name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched.current) setSlug(tidySlug(e.target.value));
              }}
              className={inputCls}
              placeholder="Home & Living"
              maxLength={60}
              required
            />
            <FieldError>{err("name")}</FieldError>
          </div>
          <div>
            <Label htmlFor="cat-slug" hint="Used in URLs like /c/home-living. Derived from the name until you edit it.">
              Slug
            </Label>
            <input
              id="cat-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                slugTouched.current = true;
                setSlug(e.target.value);
              }}
              onBlur={(e) => setSlug(tidySlug(e.target.value))}
              className={cn(inputCls, "font-mono text-[13px]")}
              placeholder="auto"
            />
            <FieldError>{err("slug")}</FieldError>
          </div>
          <div>
            <Label htmlFor="cat-menu" hint="Short heading in the header. Defaults to the name." optional>
              Menu label
            </Label>
            <input
              id="cat-menu"
              name="menuLabel"
              value={menuLabel}
              onChange={(e) => setMenuLabel(e.target.value)}
              className={inputCls}
              placeholder={name || "Home"}
              maxLength={40}
            />
            <FieldError>{err("menuLabel")}</FieldError>
          </div>
          <div>
            <Label htmlFor="cat-sort" hint="Lower numbers come first. Leave blank to keep the current position." optional>
              Position
            </Label>
            <input
              id="cat-sort"
              name="sortOrder"
              type="number"
              min={0}
              step={1}
              defaultValue={initial?.sortOrder ?? ""}
              className={inputCls}
              placeholder="auto"
            />
            <FieldError>{err("sortOrder")}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cat-description" hint="Shown on the category landing page and used as its search-engine description.">
              Description
            </Label>
            <textarea
              id="cat-description"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              className={textareaCls}
              placeholder="Furniture, décor and textiles from independent Indian studios."
              required
            />
            <FieldError>{err("description")}</FieldError>
          </div>
        </div>
      </FormSection>

      <FormSection title="Appearance" description="The icon and accent colour brand the department across the menu, chips and landing page.">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="cat-icon" hint="A Lucide icon name (lucide.dev/icons). Pick one below or type any name.">
                Icon
              </Label>
              <div className="flex items-center gap-2">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline"
                  style={{ backgroundColor: `${previewAccent}1a`, color: previewAccent }}
                  aria-hidden
                >
                  {PreviewIcon ? <PreviewIcon size={18} /> : <span className="text-[10px] font-semibold uppercase text-ink-400">?</span>}
                </span>
                <input
                  id="cat-icon"
                  name="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className={cn(inputCls, "font-mono text-[13px]")}
                  placeholder="chef-hat"
                  required
                />
              </div>
              {!PreviewIcon && icon.trim() && (
                <p className="mt-1.5 text-[11.5px] text-ink-400">No preview for “{icon.trim()}” — it will be checked against Lucide when you save.</p>
              )}
              <FieldError>{err("icon")}</FieldError>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {Object.entries(SUGGESTED_ICONS).map(([key, Icon]) => {
                  const selected = key === icon.trim().toLowerCase();
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIcon(key)}
                      title={key}
                      aria-label={`Use icon ${key}`}
                      aria-pressed={selected}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                        selected
                          ? "border-brand-600 bg-brand-50 text-brand-800"
                          : "border-hairline text-ink-500 hover:border-ink-300 hover:text-ink-900",
                      )}
                    >
                      <Icon size={15} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="cat-accent" hint="Six-digit hex colour, e.g. #2c837c.">
                Accent colour
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={previewAccent}
                  onChange={(e) => setAccent(e.target.value)}
                  aria-label="Pick accent colour"
                  className="h-10 w-12 cursor-pointer rounded-lg border border-ink-200 bg-canvas p-1"
                />
                <input
                  id="cat-accent"
                  name="accent"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value.trim())}
                  className={cn(inputCls, "max-w-[160px] font-mono text-[13px]", !accentValid && "border-sale-400")}
                  placeholder="#2c837c"
                  maxLength={7}
                  required
                />
                {!accentValid && <span className="text-[12px] text-sale-600">Not a valid hex colour</span>}
              </div>
              <FieldError>{err("accent")}</FieldError>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="cat-image" hint="An https:// URL or a path under /public. Square images crop best.">
                  Image URL
                </Label>
                <input
                  id="cat-image"
                  name="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value.trim())}
                  className={inputCls}
                  placeholder="https://images.unsplash.com/…"
                  required
                />
                <FieldError>{err("imageUrl")}</FieldError>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cat-image-alt" hint="Describes the image for screen readers. Defaults to the name." optional>
                  Image alt text
                </Label>
                <input
                  id="cat-image-alt"
                  name="imageAlt"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className={inputCls}
                  placeholder={name ? `${name} on WeekendCart` : "What the picture shows"}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-ink-800">Preview</p>
            <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
              <div className="relative aspect-square bg-ink-100">
                {previewImage ? (
                  <Image
                    key={imageUrl}
                    src={imageUrl}
                    alt={imageAlt || name || "Category image"}
                    fill
                    unoptimized
                    sizes="240px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1.5 text-ink-400">
                    <ImageOff size={20} />
                    <span className="text-[11.5px]">Add an image URL</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderTop: `3px solid ${previewAccent}` }}>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${previewAccent}1a`, color: previewAccent }}
                >
                  {PreviewIcon ? <PreviewIcon size={14} /> : <Tag size={14} />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink-950">{menuLabel || name || "Category"}</p>
                  <p className="truncate text-[11px] text-ink-400">/c/{slug || "slug"}</p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
              Roughly how the tile looks in the mega menu and on the home page.
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Mega menu" description="Extra content shown in the header dropdown for this department.">
        <div className="grid gap-4">
          <div>
            <Label
              htmlFor="cat-highlights"
              hint={`One per line, up to ${MAX_HIGHLIGHTS}. Short phrases like “Free delivery over ₹999”.`}
              optional
            >
              Highlights
            </Label>
            <textarea
              id="cat-highlights"
              name="highlights"
              rows={4}
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              className={textareaCls}
              placeholder={"Free delivery over ₹999\n7-day easy returns"}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <FieldError>{err("highlights")}</FieldError>
              <span
                className={cn(
                  "ml-auto text-[11.5px] tabular-nums",
                  highlightCount > MAX_HIGHLIGHTS ? "font-medium text-sale-600" : "text-ink-400",
                )}
              >
                {highlightCount} / {MAX_HIGHLIGHTS}
              </span>
            </div>
          </div>

          <div>
            <Label hint="Brands spotlighted in this department's menu panel, in the order you tick them." optional>
              Featured brands
            </Label>
            {brands.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink-200 px-3 py-4 text-center text-[12.5px] text-ink-500">
                No brands yet — add brands first, then feature them here.
              </p>
            ) : (
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {brands.map((b) => {
                  const checked = selectedBrands.has(b.slug);
                  return (
                    <label
                      key={b.slug}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition-colors",
                        checked ? "border-brand-300 bg-brand-50" : "border-hairline hover:border-ink-300",
                      )}
                    >
                      <input
                        type="checkbox"
                        name="featuredBrandSlugs"
                        value={b.slug}
                        checked={checked}
                        onChange={(e) => {
                          setSelectedBrands((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(b.slug);
                            else next.delete(b.slug);
                            return next;
                          });
                        }}
                        className="h-4 w-4 accent-[var(--color-brand-700)]"
                      />
                      <span className="min-w-0 flex-1 truncate text-ink-900">{b.name}</span>
                      {!b.isActive && <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-400">Inactive</span>}
                    </label>
                  );
                })}
              </div>
            )}
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <FieldError>{err("featuredBrandSlugs")}</FieldError>
              <span className="ml-auto text-[11.5px] text-ink-400">
                {orderedSelection.length === 0
                  ? "None selected"
                  : `${orderedSelection.length} selected: ${orderedSelection.join(", ")}`}
              </span>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Tax defaults" description="Products in this category inherit these unless they set their own.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cat-hsn" hint="4, 6 or 8 digits. Printed on the tax invoice for every product that inherits it." optional>
              Default HSN code
            </Label>
            <input
              id="cat-hsn"
              name="defaultHsnCode"
              inputMode="numeric"
              maxLength={8}
              defaultValue={initial?.defaultHsnCode ?? ""}
              className={cn(inputCls, "font-mono text-[13px]")}
              placeholder="8517"
            />
            <FieldError>{err("defaultHsnCode")}</FieldError>
          </div>
          <div>
            <Label htmlFor="cat-tax" hint="Leave blank to fall back to the rate in Settings." optional>
              Default GST rate
            </Label>
            <select
              id="cat-tax"
              name="defaultTaxRate"
              defaultValue={initial?.defaultTaxRate ?? ""}
              className={selectCls}
              style={selectArrow}
            >
              <option value="">Use the rate in Settings</option>
              {GST_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
            <FieldError>{err("defaultTaxRate")}</FieldError>
          </div>
        </div>
      </FormSection>

      <FormSection title="Visibility">
        <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-ink-800">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initial?.isActive ?? true}
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]"
          />
          <span>
            <span className="block font-medium">Active</span>
            <span className="block text-[12.5px] text-ink-500">
              Hidden categories leave the header menu, footer and home page; their products stay reachable by direct link and search.
            </span>
          </span>
        </label>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </Form>
  );
}
