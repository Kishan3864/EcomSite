"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logActivity, requireAdmin } from "@/lib/auth/admin";
import type { FormState } from "./form-state";
import { bool, revalidateAdmin, slugify, str } from "./shared";

/**
 * Wholesaler actions. Shaped on brands-actions.ts, the house reference:
 * requireAdmin → validate FormData → write → logActivity → revalidate →
 * redirect with a flash (or return FormState for inline errors).
 *
 * One deliberate difference from brands: nothing here calls
 * `revalidateStorefront`. A wholesaler is admin-only bookkeeping — no shopper
 * page reads it, so busting the storefront cache would be pure waste. The
 * products list is revalidated instead, because it shows the supplier column.
 */

const LIST = "/admin/suppliers";
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

const flash = (message: string, tone?: "error") =>
  `${LIST}?flash=${encodeURIComponent(message)}${tone ? `&tone=${tone}` : ""}`;

/** Both lists change: the suppliers list itself, and the products list's column and filter. */
function revalidateSuppliers() {
  revalidateAdmin("suppliers");
  revalidateAdmin("products");
}

function validate(formData: FormData) {
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const contactName = str(formData, "contactName");
  const phone = str(formData, "phone");
  const email = str(formData, "email") || null;
  const gstin = str(formData, "gstin").toUpperCase().replace(/\s+/g, "") || null;
  const city = str(formData, "city") || null;
  const notes = str(formData, "notes") || null;
  const isActive = bool(formData, "isActive");

  if (name.length < 2) return { error: "The wholesaler needs a name.", field: "name" } as const;
  if (name.length > 120) return { error: "Keep the name under 120 characters.", field: "name" } as const;
  if (!slug) return { error: "Slug cannot be empty — use letters, numbers and dashes.", field: "slug" } as const;
  if (contactName.length < 2) return { error: "Who do you ask for there?", field: "contactName" } as const;
  // Market suppliers hand out landlines as often as mobiles, so this only
  // checks that a usable number was typed — not that it is a 10-digit mobile.
  if (phone.replace(/\D/g, "").length < 6) return { error: "Enter a phone number for them.", field: "phone" } as const;
  if (email && !EMAIL.test(email)) return { error: "That email does not look right.", field: "email" } as const;
  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) {
    return { error: "A GSTIN is 15 characters, digits and capitals only.", field: "gstin" } as const;
  }
  if (notes && notes.length > 2000) return { error: "Keep the notes under 2000 characters.", field: "notes" } as const;

  return { data: { name, slug, contactName, phone, email, gstin, city, notes, isActive } } as const;
}

export async function createSupplier(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const result = validate(formData);
  if ("error" in result) return result;

  const clash = await db.supplier.findUnique({ where: { slug: result.data.slug } });
  if (clash) return { error: `The slug “${result.data.slug}” is already used by ${clash.name}.`, field: "slug" };

  const supplier = await db.supplier.create({ data: result.data });

  await logActivity(session, {
    action: "supplier.create",
    entity: "Supplier",
    entityId: supplier.id,
    summary: `Added wholesaler ${supplier.name}`,
  });
  revalidateSuppliers();
  redirect(flash(`${supplier.name} added`));
}

export async function updateSupplier(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");
  const result = validate(formData);
  if ("error" in result) return result;

  const clash = await db.supplier.findFirst({ where: { slug: result.data.slug, NOT: { id } } });
  if (clash) return { error: `The slug “${result.data.slug}” is already used by ${clash.name}.`, field: "slug" };

  const supplier = await db.supplier.update({ where: { id }, data: result.data });

  await logActivity(session, {
    action: "supplier.update",
    entity: "Supplier",
    entityId: supplier.id,
    summary: `Updated wholesaler ${supplier.name}`,
    metadata: { isActive: supplier.isActive },
  });
  revalidateSuppliers();
  return { ok: true, message: "Saved." };
}

export async function deleteSupplier(formData: FormData) {
  const session = await requireAdmin("OWNER");
  const id = str(formData, "id");

  const supplier = await db.supplier.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!supplier) redirect(flash("Wholesaler not found", "error"));

  // Product.supplierId is ON DELETE SET NULL, so deleting would not error — it
  // would quietly wipe the sourcing history off every product bought here,
  // which is the one thing this feature exists to keep. Refuse instead.
  if (supplier._count.products > 0) {
    redirect(
      flash(
        `${supplier.name} is recorded on ${supplier._count.products} product${supplier._count.products > 1 ? "s" : ""}. Deleting would erase where they came from — deactivate the wholesaler instead.`,
        "error",
      ),
    );
  }

  await db.supplier.delete({ where: { id } });
  await logActivity(session, {
    action: "supplier.delete",
    entity: "Supplier",
    entityId: id,
    summary: `Deleted wholesaler ${supplier.name}`,
  });
  revalidateSuppliers();
  redirect(flash(`${supplier.name} deleted`));
}

export async function toggleSupplierActive(formData: FormData) {
  const session = await requireAdmin("MANAGER");
  const id = str(formData, "id");
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) return;

  const updated = await db.supplier.update({ where: { id }, data: { isActive: !supplier.isActive } });
  await logActivity(session, {
    action: updated.isActive ? "supplier.activate" : "supplier.deactivate",
    entity: "Supplier",
    entityId: id,
    summary: `${updated.isActive ? "Reactivated" : "Deactivated"} wholesaler ${updated.name}`,
  });
  revalidateSuppliers();
}
