"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn, slugify } from "@/lib/utils";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";

export interface SubcategoryFormValues {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number | null;
  isActive: boolean;
}

function looksLikeImage(value: string) {
  return /^https?:\/\/\S+$/i.test(value) || (value.startsWith("/") && !value.startsWith("//"));
}

const tidySlug = (v: string) => slugify(v).replace(/^-|-$/g, "");

export function SubcategoryForm({
  action,
  initial,
  categorySlug,
  submitLabel = "Save subcategory",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Partial<SubcategoryFormValues>;
  categorySlug: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const slugTouched = useRef(Boolean(initial?.slug));
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt ?? "");
  const previewImage = looksLikeImage(imageUrl);

  return (
    <form action={formAction} className="grid gap-5">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}
      {state.error && state.field && (
        <Notice tone="error">Please fix the highlighted field below — {state.error}</Notice>
      )}

      <FormSection title="Details" description="Shown as a column heading in the mega menu and as its own listing page.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sub-name">Subcategory name</Label>
            <input
              id="sub-name"
              name="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched.current) setSlug(tidySlug(e.target.value));
              }}
              className={inputCls}
              placeholder="Sofas & Seating"
              maxLength={60}
              required
            />
            <FieldError>{err("name")}</FieldError>
          </div>
          <div>
            <Label htmlFor="sub-slug" hint={`Listing lives at /c/${categorySlug}/<slug>. Unique within this category.`}>
              Slug
            </Label>
            <input
              id="sub-slug"
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
          <div className="sm:col-span-2">
            <Label htmlFor="sub-description" hint="One line, under 160 characters. Appears beneath the name in the menu.">
              Description
            </Label>
            <textarea
              id="sub-description"
              name="description"
              rows={2}
              defaultValue={initial?.description ?? ""}
              className={textareaCls}
              placeholder="Three-seaters, loungers and accent chairs."
              maxLength={160}
              required
            />
            <FieldError>{err("description")}</FieldError>
          </div>
          <div>
            <Label htmlFor="sub-sort" hint="Lower numbers come first. Leave blank to keep the current position." optional>
              Position
            </Label>
            <input
              id="sub-sort"
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
        </div>
      </FormSection>

      <FormSection title="Image" description="Used on the category landing page tiles and the subcategory listing hero.">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="sub-image" hint="An https:// URL or a path under /public.">
                Image URL
              </Label>
              <input
                id="sub-image"
                name="imageUrl"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value.trim())}
                className={inputCls}
                placeholder="https://images.unsplash.com/…"
                required
              />
              <FieldError>{err("imageUrl")}</FieldError>
            </div>
            <div>
              <Label htmlFor="sub-image-alt" hint="Describes the image for screen readers. Defaults to the name." optional>
                Image alt text
              </Label>
              <input
                id="sub-image-alt"
                name="imageAlt"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className={inputCls}
                placeholder={name || "What the picture shows"}
              />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-ink-800">Preview</p>
            <div className="relative aspect-square overflow-hidden rounded-xl border border-hairline bg-ink-100">
              {previewImage ? (
                <Image
                  key={imageUrl}
                  src={imageUrl}
                  alt={imageAlt || name || "Subcategory image"}
                  fill
                  unoptimized
                  sizes="160px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1.5 text-ink-400">
                  <ImageOff size={18} />
                  <span className="text-[11px]">Add an image URL</span>
                </div>
              )}
            </div>
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
              Hidden subcategories leave the menu and category page; their products stay reachable by direct link and search.
            </span>
          </span>
        </label>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
