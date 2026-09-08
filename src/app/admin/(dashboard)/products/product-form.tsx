"use client";

import { useActionState, useMemo, useState } from "react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls, selectArrow, selectCls, textareaCls } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { ImagesEditor, RelationPicker, SpecsEditor, VariantsEditor } from "./product-editors";
import {
  PRODUCT_BADGES,
  PRODUCT_STATUSES,
  STATUS_HELP,
  WARRANTY_DEFAULT,
  type CatalogItem,
  type ImageInput,
  type ProductStatusValue,
  type SpecGroupInput,
  type VariantGroupInput,
} from "./product-schema";

export interface ProductFormValues {
  title: string;
  slug: string;
  sku: string;
  subtitle: string;
  description: string;
  status: ProductStatusValue;
  price: number | "";
  mrp: number | "";
  stock: number;
  lowStockThreshold: number;
  badges: string[];
  tags: string[];
  colors: string[];
  highlights: string[];
  specifications: SpecGroupInput[];
  deliveryDays: number;
  codAvailable: boolean;
  returnWindowDays: number;
  warranty: string;
  freeShipping: boolean;
  videoPoster: string;
  metaTitle: string;
  metaDescription: string;
  brandId: string;
  categoryId: string;
  subcategoryId: string;
  images: ImageInput[];
  variantGroups: VariantGroupInput[];
  relatedIds: string[];
  bundleIds: string[];
}

export interface ProductFormOptions {
  brands: { id: string; name: string; isActive: boolean }[];
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string; categoryId: string }[];
  catalog: CatalogItem[];
}

const DEFAULTS: ProductFormValues = {
  title: "",
  slug: "",
  sku: "",
  subtitle: "",
  description: "",
  status: "DRAFT",
  price: "",
  mrp: "",
  stock: 0,
  lowStockThreshold: 10,
  badges: [],
  tags: [],
  colors: [],
  highlights: [],
  specifications: [],
  deliveryDays: 3,
  codAvailable: true,
  returnWindowDays: 10,
  warranty: WARRANTY_DEFAULT,
  freeShipping: true,
  videoPoster: "",
  metaTitle: "",
  metaDescription: "",
  brandId: "",
  categoryId: "",
  subcategoryId: "",
  images: [],
  variantGroups: [],
  relatedIds: [],
  bundleIds: [],
};

/**
 * One form for create and edit. Scalar fields are uncontrolled; the dynamic
 * lists (images, specs, variants, relations) live in state and are posted as
 * JSON / repeated hidden fields. React resets a form after its action
 * settles, so the values a user typed are captured on submit and re-used as
 * defaults — a validation error never wipes the page.
 */
export function ProductForm({
  action,
  initial,
  options,
  selfId,
  readOnly = false,
  submitLabel = "Save product",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<ProductFormValues>;
  options: ProductFormOptions;
  selfId?: string;
  readOnly?: boolean;
  submitLabel?: string;
}) {
  const init = useMemo(() => ({ ...DEFAULTS, ...initial }), [initial]);
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const dv = (name: string, fallback: string | number) => (draft ? (draft[name] ?? "") : String(fallback));
  const dc = (name: string, fallback: boolean) => (draft ? draft[name] === "on" : fallback);

  const [categoryId, setCategoryId] = useState(init.categoryId);
  const [subcategoryId, setSubcategoryId] = useState(init.subcategoryId);
  const [images, setImages] = useState<ImageInput[]>(init.images);
  const [specs, setSpecs] = useState<SpecGroupInput[]>(init.specifications);
  const [variants, setVariants] = useState<VariantGroupInput[]>(init.variantGroups);
  const [related, setRelated] = useState<string[]>(init.relatedIds);
  const [bundle, setBundle] = useState<string[]>(init.bundleIds);

  const subcategories = options.subcategories.filter((s) => s.categoryId === categoryId);
  const statusHelp = STATUS_HELP;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const captured: Record<string, string> = {};
        fd.forEach((v, k) => {
          if (typeof v === "string" && !(k in captured)) captured[k] = v;
        });
        // Checkbox groups repeat a key; keep each value so re-rendering restores them.
        for (const b of fd.getAll("badges")) if (typeof b === "string") captured[`badge:${b}`] = "on";
        setDraft(captured);
      }}
      className="grid gap-5"
    >
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.error && state.field && (
        <Notice tone="error">
          {state.error} <span className="text-sale-600/80">— see the highlighted field.</span>
        </Notice>
      )}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}
      {readOnly && <Notice tone="info">You have read-only access. Ask a manager to make changes.</Notice>}

      <fieldset disabled={readOnly} className="contents">
        {/* ------------------------------ Basics ------------------------------ */}
        <FormSection title="Basics" description="Title, identifiers and the copy shoppers read first.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="p-title">Title</Label>
              <input id="p-title" name="title" defaultValue={dv("title", init.title)} className={inputCls} placeholder="Orbo Zenith 5 Smartwatch" required maxLength={160} />
              <FieldError>{err("title")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-slug" hint="Used in the product URL (/p/…). Leave blank to derive from the title.">
                Slug
              </Label>
              <input id="p-slug" name="slug" defaultValue={dv("slug", init.slug)} className={cn(inputCls, "font-mono text-[13px]")} placeholder="auto" />
              <FieldError>{err("slug")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-sku" hint="Unique stock code. Letters, numbers, dots, dashes or slashes.">
                SKU
              </Label>
              <input id="p-sku" name="sku" defaultValue={dv("sku", init.sku)} className={cn(inputCls, "font-mono text-[13px] uppercase")} placeholder="MAY-ELE-0140" required />
              <FieldError>{err("sku")}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="p-subtitle" hint="One line under the title — shown on cards and in search results.">
                Subtitle
              </Label>
              <input id="p-subtitle" name="subtitle" defaultValue={dv("subtitle", init.subtitle)} className={inputCls} placeholder="AMOLED display, 14-day battery, Bluetooth calling" required />
              <FieldError>{err("subtitle")}</FieldError>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="p-description">Description</Label>
              <textarea id="p-description" name="description" rows={6} defaultValue={dv("description", init.description)} className={textareaCls} required />
              <FieldError>{err("description")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-status">Status</Label>
              <select id="p-status" name="status" defaultValue={dv("status", init.status)} className={selectCls} style={selectArrow}>
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "ACTIVE" ? "Active — live on the storefront" : s === "DRAFT" ? "Draft — hidden" : "Archived — retired"}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11.5px] text-ink-400">
                {PRODUCT_STATUSES.map((s) => `${s === "ACTIVE" ? "Active" : s === "DRAFT" ? "Draft" : "Archived"}: ${statusHelp[s]}`).join(" ")}
              </p>
              <FieldError>{err("status")}</FieldError>
            </div>
          </div>
        </FormSection>

        {/* --------------------------- Pricing & stock ------------------------ */}
        <FormSection title="Pricing & stock" description="Whole rupees, GST included. Stock edits here are recorded as a manual movement.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="p-price">Selling price (₹)</Label>
              <input id="p-price" name="price" type="number" min={1} step={1} inputMode="numeric" defaultValue={dv("price", init.price)} className={cn(inputCls, "tabular-nums")} required />
              <FieldError>{err("price")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-mrp" hint="Must be at least the selling price. Blank = same as price.">
                MRP (₹)
              </Label>
              <input id="p-mrp" name="mrp" type="number" min={1} step={1} inputMode="numeric" defaultValue={dv("mrp", init.mrp)} className={cn(inputCls, "tabular-nums")} />
              <FieldError>{err("mrp")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-stock">Stock on hand</Label>
              <input id="p-stock" name="stock" type="number" min={0} step={1} inputMode="numeric" defaultValue={dv("stock", init.stock)} className={cn(inputCls, "tabular-nums")} required />
              <FieldError>{err("stock")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-low" hint="Flagged as low at or below this number.">
                Low-stock alert
              </Label>
              <input id="p-low" name="lowStockThreshold" type="number" min={0} step={1} inputMode="numeric" defaultValue={dv("lowStockThreshold", init.lowStockThreshold)} className={cn(inputCls, "tabular-nums")} required />
              <FieldError>{err("lowStockThreshold")}</FieldError>
            </div>
          </div>
        </FormSection>

        {/* ---------------------------- Organisation -------------------------- */}
        <FormSection title="Organisation" description="Where the product lives in the catalogue and how it is labelled.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="p-brand">Brand</Label>
              <select id="p-brand" name="brandId" defaultValue={dv("brandId", init.brandId)} className={selectCls} style={selectArrow} required>
                <option value="">Choose a brand…</option>
                {options.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.isActive ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
              <FieldError>{err("brandId")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-category">Category</Label>
              <select
                id="p-category"
                name="categoryId"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId("");
                }}
                className={selectCls}
                style={selectArrow}
                required
              >
                <option value="">Choose a category…</option>
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError>{err("categoryId")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-subcategory">Subcategory</Label>
              <select
                id="p-subcategory"
                name="subcategoryId"
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className={selectCls}
                style={selectArrow}
                disabled={!categoryId}
                required
              >
                <option value="">{categoryId ? "Choose a subcategory…" : "Pick a category first"}</option>
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <FieldError>{err("subcategoryId")}</FieldError>
            </div>
          </div>

          <div>
            <Label>Badges</Label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_BADGES.map((b) => {
                const checked = draft ? draft[`badge:${b.value}`] === "on" : init.badges.includes(b.value);
                return (
                  <label
                    key={b.value}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 bg-canvas px-3 py-1.5 text-[12.5px] text-ink-800 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-900"
                  >
                    <input type="checkbox" name="badges" value={b.value} defaultChecked={checked} className="h-3.5 w-3.5 accent-[var(--color-brand-700)]" />
                    {b.label}
                  </label>
                );
              })}
            </div>
            <FieldError>{err("badges")}</FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="p-tags" hint="Comma separated. Used by search and “similar items”." optional>
                Tags
              </Label>
              <input id="p-tags" name="tags" defaultValue={dv("tags", init.tags.join(", "))} className={inputCls} placeholder="smartwatch, fitness, amoled" />
            </div>
            <div>
              <Label htmlFor="p-colors" hint="Comma separated colour names shown in filters." optional>
                Colours
              </Label>
              <input id="p-colors" name="colors" defaultValue={dv("colors", init.colors.join(", "))} className={inputCls} placeholder="Midnight Blue, Sand" />
            </div>
          </div>
        </FormSection>

        {/* ------------------------------ Images ------------------------------ */}
        <FormSection title="Images" description="The first image is the cover. An active product needs at least one.">
          <input type="hidden" name="images" value={JSON.stringify(images)} readOnly />
          <ImagesEditor value={images} onChange={setImages} />
          <FieldError>{err("images")}</FieldError>
        </FormSection>

        {/* ----------------------------- Content ------------------------------ */}
        <FormSection title="Highlights & specifications" description="Bullet points near the price, and the detailed spec table lower on the page.">
          <div>
            <Label htmlFor="p-highlights" hint="One per line, up to 12." optional>
              Highlights
            </Label>
            <textarea id="p-highlights" name="highlights" rows={5} defaultValue={dv("highlights", init.highlights.join("\n"))} className={textareaCls} placeholder={"14-day battery life\nAlways-on AMOLED display"} />
            <FieldError>{err("highlights")}</FieldError>
          </div>
          <div>
            <Label optional>Specifications</Label>
            <input type="hidden" name="specifications" value={JSON.stringify(specs)} readOnly />
            <SpecsEditor value={specs} onChange={setSpecs} />
            <FieldError>{err("specifications")}</FieldError>
          </div>
        </FormSection>

        {/* ----------------------------- Variants ----------------------------- */}
        <FormSection title="Variants" description="Options shoppers choose before adding to cart. Price differences are added to the selling price.">
          <input type="hidden" name="variantGroups" value={JSON.stringify(variants)} readOnly />
          <VariantsEditor value={variants} onChange={setVariants} />
          <FieldError>{err("variantGroups")}</FieldError>
        </FormSection>

        {/* ---------------------------- Fulfilment ---------------------------- */}
        <FormSection title="Delivery & returns" description="What the product page promises about shipping, payment and after-sales.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="p-delivery" hint="1–60 days.">
                Delivery time (days)
              </Label>
              <input id="p-delivery" name="deliveryDays" type="number" min={1} max={60} step={1} defaultValue={dv("deliveryDays", init.deliveryDays)} className={cn(inputCls, "tabular-nums")} required />
              <FieldError>{err("deliveryDays")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-return" hint="0 means no returns.">
                Return window (days)
              </Label>
              <input id="p-return" name="returnWindowDays" type="number" min={0} max={90} step={1} defaultValue={dv("returnWindowDays", init.returnWindowDays)} className={cn(inputCls, "tabular-nums")} required />
              <FieldError>{err("returnWindowDays")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-warranty">Warranty</Label>
              <input id="p-warranty" name="warranty" defaultValue={dv("warranty", init.warranty)} className={inputCls} placeholder={WARRANTY_DEFAULT} />
              <FieldError>{err("warranty")}</FieldError>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-canvas p-3 text-[13.5px] text-ink-800">
              <input type="checkbox" name="codAvailable" defaultChecked={dc("codAvailable", init.codAvailable)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]" />
              <span>
                <span className="block font-medium">Cash on delivery</span>
                <span className="block text-[12.5px] text-ink-500">Let shoppers pay when the parcel arrives.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-canvas p-3 text-[13.5px] text-ink-800">
              <input type="checkbox" name="freeShipping" defaultChecked={dc("freeShipping", init.freeShipping)} className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]" />
              <span>
                <span className="block font-medium">Free shipping</span>
                <span className="block text-[12.5px] text-ink-500">Shows the free-delivery badge on the product page.</span>
              </span>
            </label>
          </div>
        </FormSection>

        {/* ---------------------------- Media & SEO --------------------------- */}
        <FormSection title="Media & SEO" description="Optional extras for the product page and search engines.">
          <div>
            <Label htmlFor="p-video" hint="Image URL shown as the poster for the product video slot." optional>
              Video poster
            </Label>
            <input id="p-video" name="videoPoster" defaultValue={dv("videoPoster", init.videoPoster)} className={inputCls} placeholder="https://…" />
            <FieldError>{err("videoPoster")}</FieldError>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="p-meta-title" hint="Under 120 characters. Defaults to the title." optional>
                Meta title
              </Label>
              <input id="p-meta-title" name="metaTitle" defaultValue={dv("metaTitle", init.metaTitle)} className={inputCls} maxLength={120} />
              <FieldError>{err("metaTitle")}</FieldError>
            </div>
            <div>
              <Label htmlFor="p-meta-desc" hint="Under 320 characters." optional>
                Meta description
              </Label>
              <textarea id="p-meta-desc" name="metaDescription" rows={2} defaultValue={dv("metaDescription", init.metaDescription)} className={textareaCls} maxLength={320} />
              <FieldError>{err("metaDescription")}</FieldError>
            </div>
          </div>
        </FormSection>

        {/* ---------------------------- Relations ----------------------------- */}
        <FormSection title="Related & bundle products" description="Only active products can be linked. Related items appear as “You may also like”; bundle items are offered together.">
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <Label hint="Up to 24." optional>
                Related products
              </Label>
              <RelationPicker name="related" catalog={options.catalog} value={related} onChange={setRelated} exclude={selfId} max={24} />
              <FieldError>{err("related")}</FieldError>
            </div>
            <div>
              <Label hint="Up to 12." optional>
                Bundle products
              </Label>
              <RelationPicker name="bundle" catalog={options.catalog} value={bundle} onChange={setBundle} exclude={selfId} max={12} />
              <FieldError>{err("bundle")}</FieldError>
            </div>
          </div>
        </FormSection>

        {!readOnly && (
          <div className="flex items-center justify-end gap-2">
            <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
          </div>
        )}
      </fieldset>
    </form>
  );
}
