"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import type { FormState } from "./form-state";
import { bool, revalidateAdmin, revalidateStorefront, slugify, str } from "./shared";

/**
 * Reference module for admin server actions. Every other module follows the
 * same shape: requireAdmin → validate FormData → write → logActivity →
 * revalidate → redirect with a flash (or return FormState for inline errors).
 */

function validate(formData: FormData) {
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const logoText = str(formData, "logoText") || name;
  const tagline = str(formData, "tagline");
  const origin = str(formData, "origin");
  const description = str(formData, "description") || null;
  const isActive = bool(formData, "isActive");

  if (name.length < 2) return { error: "Brand name is required.", field: "name" } as const;
  if (!slug) return { error: "Slug cannot be empty.", field: "slug" } as const;
  if (tagline.length < 3) return { error: "Add a short tagline.", field: "tagline" } as const;
  if (origin.length < 2) return { error: "Where is the brand based?", field: "origin" } as const;

  return { data: { name, slug, logoText, tagline, origin, description, isActive } } as const;
}

export async function createBrand(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const result = validate(formData);
  if ("error" in result) return result;

  const clash = await db.brand.findUnique({ where: { slug: result.data.slug } });
  if (clash) return { error: `The slug “${result.data.slug}” is already used by ${clash.name}.`, field: "slug" };

  const brand = await db.brand.create({ data: result.data });

  await logActivity(session, {
    action: "brand.create",
    entity: "Brand",
    entityId: brand.id,
    summary: `Created brand ${brand.name}`,
  });
  revalidateStorefront();
  revalidateAdmin("brands");
  redirect(`/admin/brands?flash=${encodeURIComponent(`${brand.name} created`)}`);
}

export async function updateBrand(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const result = validate(formData);
  if ("error" in result) return result;

  const clash = await db.brand.findFirst({ where: { slug: result.data.slug, NOT: { id } } });
  if (clash) return { error: `The slug “${result.data.slug}” is already used by ${clash.name}.`, field: "slug" };

  const brand = await db.brand.update({ where: { id }, data: result.data });

  await logActivity(session, {
    action: "brand.update",
    entity: "Brand",
    entityId: brand.id,
    summary: `Updated brand ${brand.name}`,
    metadata: { isActive: brand.isActive },
  });
  revalidateStorefront();
  revalidateAdmin("brands");
  return { ok: true, message: "Saved." };
}

export async function deleteBrand(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");

  const brand = await db.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) redirect(`/admin/brands?flash=${encodeURIComponent("Brand not found")}&tone=error`);

  // Products keep a required brand; refuse rather than orphan them.
  if (brand._count.products > 0) {
    redirect(
      `/admin/brands?flash=${encodeURIComponent(
        `${brand.name} still has ${brand._count.products} products. Move them first, or deactivate the brand instead.`,
      )}&tone=error`,
    );
  }

  await db.brand.delete({ where: { id } });
  await logActivity(session, {
    action: "brand.delete",
    entity: "Brand",
    entityId: id,
    summary: `Deleted brand ${brand.name}`,
  });
  revalidateStorefront();
  revalidateAdmin("brands");
  redirect(`/admin/brands?flash=${encodeURIComponent(`${brand.name} deleted`)}`);
}

export async function toggleBrandActive(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const brand = await db.brand.findUnique({ where: { id } });
  if (!brand) return;

  const updated = await db.brand.update({ where: { id }, data: { isActive: !brand.isActive } });
  await logActivity(session, {
    action: updated.isActive ? "brand.activate" : "brand.deactivate",
    entity: "Brand",
    entityId: id,
    summary: `${updated.isActive ? "Activated" : "Deactivated"} brand ${updated.name}`,
  });
  revalidateStorefront();
  revalidateAdmin("brands");
}
