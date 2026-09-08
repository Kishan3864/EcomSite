"use client";

import { useActionState, useState } from "react";
import { ImageOff } from "lucide-react";
import type { BannerPlacement } from "@/generated/prisma/client";
import { Notice, SubmitButton } from "@/components/admin/client";
import {
  FieldError,
  FormSection,
  Label,
  inputCls,
  selectArrow,
  selectCls,
  textareaCls,
} from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { cn } from "@/lib/utils";
import { PLACEMENTS, PLACEMENT_META } from "./lib";

export interface BannerFormValues {
  placement: BannerPlacement;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  imageUrl: string;
  imageAlt: string;
  align: string;
  theme: string;
  sortOrder: number | "";
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const DEFAULTS: BannerFormValues = {
  placement: "HERO",
  eyebrow: "",
  title: "",
  subtitle: "",
  cta: "Shop now",
  href: "/products",
  imageUrl: "",
  imageAlt: "",
  align: "left",
  theme: "dark",
  sortOrder: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export function BannerForm({
  action,
  initial,
  submitLabel = "Save banner",
  readOnly = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<BannerFormValues>;
  submitLabel?: string;
  readOnly?: boolean;
}) {
  const init = { ...DEFAULTS, ...initial };
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  // Mirrored so the live preview and the placement-specific fields react as you type.
  const [placement, setPlacement] = useState<BannerPlacement>(init.placement);
  const [imageUrl, setImageUrl] = useState(init.imageUrl);
  const [title, setTitle] = useState(init.title);
  const [eyebrow, setEyebrow] = useState(init.eyebrow);
  const [subtitle, setSubtitle] = useState(init.subtitle);
  const [cta, setCta] = useState(init.cta);
  const [theme, setTheme] = useState(init.theme);
  const [align, setAlign] = useState(init.align);

  const meta = PLACEMENT_META[placement];
  const isTile = placement === "PROMO_TILE";
  const dark = placement === "MID" ? theme === "dark" : true;

  return (
    <form action={formAction} className="grid gap-5">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <FormSection title="Placement" description="Where on the home page this appears.">
        <div className="grid gap-3 sm:grid-cols-3">
          {PLACEMENTS.map((p) => (
            <label
              key={p}
              className={cn(
                "cursor-pointer rounded-xl border p-3 transition-colors",
                placement === p ? "border-brand-700 bg-brand-50" : "border-ink-200 hover:border-ink-400",
                readOnly && "pointer-events-none opacity-60",
              )}
            >
              <input
                type="radio"
                name="placement"
                value={p}
                checked={placement === p}
                onChange={() => setPlacement(p)}
                className="sr-only"
                disabled={readOnly}
              />
              <span className="block text-[13px] font-semibold text-ink-950">
                {PLACEMENT_META[p].label}
              </span>
              <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-500">
                {PLACEMENT_META[p].description}
              </span>
            </label>
          ))}
        </div>
        <FieldError>{err("placement")}</FieldError>
      </FormSection>

      <FormSection title="Content" description="What the shopper reads.">
        <div className="grid gap-4 sm:grid-cols-2">
          {!isTile && (
            <div>
              <Label htmlFor="b-eyebrow" optional hint="Small label above the headline.">
                Eyebrow
              </Label>
              <input
                id="b-eyebrow"
                name="eyebrow"
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                className={inputCls}
                maxLength={60}
                disabled={readOnly}
                placeholder="Festive Edit 2026"
              />
              <FieldError>{err("eyebrow")}</FieldError>
            </div>
          )}
          <div className={isTile ? "sm:col-span-2" : ""}>
            <Label htmlFor="b-title">Headline</Label>
            <input
              id="b-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              maxLength={90}
              required
              disabled={readOnly}
              placeholder="Made well. Priced honestly."
            />
            <FieldError>{err("title")}</FieldError>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="b-subtitle" optional>
              {isTile ? "One-line subtitle" : "Subtitle"}
            </Label>
            <textarea
              id="b-subtitle"
              name="subtitle"
              rows={isTile ? 1 : 2}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className={textareaCls}
              maxLength={220}
              disabled={readOnly}
            />
            <FieldError>{err("subtitle")}</FieldError>
          </div>
          <div>
            <Label htmlFor="b-cta">{isTile ? "Link label" : "Button label"}</Label>
            <input
              id="b-cta"
              name="cta"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className={inputCls}
              maxLength={40}
              disabled={readOnly}
            />
            <FieldError>{err("cta")}</FieldError>
          </div>
          <div>
            <Label htmlFor="b-href" hint="A path on this site, e.g. /c/fashion or /offers.">
              Links to
            </Label>
            <input
              id="b-href"
              name="href"
              defaultValue={init.href}
              className={inputCls}
              required
              disabled={readOnly}
              placeholder="/offers"
            />
            <FieldError>{err("href")}</FieldError>
          </div>
        </div>
      </FormSection>

      <FormSection title="Image" description={meta.hint}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="b-image">Image URL</Label>
              <input
                id="b-image"
                name="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={inputCls}
                required
                disabled={readOnly}
                placeholder="https://images.unsplash.com/photo-…"
              />
              <FieldError>{err("imageUrl")}</FieldError>
            </div>
            <div>
              <Label htmlFor="b-alt" optional hint="Describes the photo for screen readers. Defaults to the headline.">
                Alt text
              </Label>
              <input
                id="b-alt"
                name="imageAlt"
                defaultValue={init.imageAlt}
                className={inputCls}
                disabled={readOnly}
              />
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-[12.5px] font-medium text-ink-800">Preview</span>
            <div
              className={cn(
                "relative overflow-hidden rounded-lg border border-hairline bg-ink-100",
                isTile ? "aspect-square" : "aspect-[16/9]",
              )}
            >
              {imageUrl ? (
                // Arbitrary remote hosts are allowed here on purpose: this is an
                // admin preview of a URL the merchandiser just typed.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-ink-300">
                  <ImageOff size={22} />
                </span>
              )}
            </div>
          </div>
        </div>
      </FormSection>

      {!isTile && (
        <FormSection title="Layout">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="b-align" hint="Which side the text sits on at desktop width.">
                Text alignment
              </Label>
              <select
                id="b-align"
                name="align"
                value={align}
                onChange={(e) => setAlign(e.target.value)}
                className={selectCls}
                style={selectArrow}
                disabled={readOnly}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
              <FieldError>{err("align")}</FieldError>
            </div>
            {placement === "MID" && (
              <div>
                <Label htmlFor="b-theme" hint="Dark sits on peacock; light on a pale card.">
                  Theme
                </Label>
                <select
                  id="b-theme"
                  name="theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className={selectCls}
                  style={selectArrow}
                  disabled={readOnly}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
                <FieldError>{err("theme")}</FieldError>
              </div>
            )}
          </div>

          {/* Rough preview of how the copy will stack on the storefront. */}
          <div
            className={cn(
              "mt-1 overflow-hidden rounded-xl p-5",
              dark ? "bg-brand-950" : "bg-gold-50",
              align === "right" && "text-right",
            )}
          >
            {eyebrow && (
              <span
                className={cn(
                  "inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  dark ? "bg-white/10 text-gold-300" : "bg-gold-200 text-gold-900",
                )}
              >
                {eyebrow}
              </span>
            )}
            <p
              className={cn(
                "mt-2 font-display text-[22px] leading-tight tracking-[-0.02em]",
                dark ? "text-white" : "text-ink-950",
              )}
            >
              {title || "Your headline"}
            </p>
            {subtitle && (
              <p className={cn("mt-1.5 text-[12.5px]", dark ? "text-white/60" : "text-ink-600")}>
                {subtitle}
              </p>
            )}
            <span
              className={cn(
                "mt-3 inline-block rounded-lg px-3 py-1.5 text-[12px] font-semibold",
                dark ? "bg-gold-500 text-ink-950" : "bg-brand-900 text-white",
              )}
            >
              {cta || "Shop now"}
            </span>
          </div>
        </FormSection>
      )}

      <FormSection title="Scheduling" description="Leave the dates blank to show it from now until you turn it off.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="b-starts" optional>
              Starts
            </Label>
            <input
              id="b-starts"
              name="startsAt"
              type="datetime-local"
              defaultValue={init.startsAt}
              className={inputCls}
              disabled={readOnly}
            />
            <FieldError>{err("startsAt")}</FieldError>
          </div>
          <div>
            <Label htmlFor="b-ends" optional>
              Ends
            </Label>
            <input
              id="b-ends"
              name="endsAt"
              type="datetime-local"
              defaultValue={init.endsAt}
              className={inputCls}
              disabled={readOnly}
            />
            <FieldError>{err("endsAt")}</FieldError>
          </div>
          <div>
            <Label htmlFor="b-sort" optional hint="0 shows first. Blank adds it to the end.">
              Position
            </Label>
            <input
              id="b-sort"
              name="sortOrder"
              type="number"
              min={0}
              step={1}
              defaultValue={init.sortOrder}
              className={inputCls}
              disabled={readOnly}
            />
            <FieldError>{err("sortOrder")}</FieldError>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-ink-800">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={init.isActive}
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand-700)]"
            disabled={readOnly}
          />
          <span>
            <span className="block font-medium">Active</span>
            <span className="block text-[12.5px] text-ink-500">
              Inactive banners never appear, whatever the dates say.
            </span>
          </span>
        </label>
      </FormSection>

      {!readOnly && (
        <div className="flex items-center justify-end gap-2">
          <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
        </div>
      )}
    </form>
  );
}
