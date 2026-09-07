import "server-only";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Helpers shared by every admin server action: form parsing, pagination and
 * the storefront revalidation that must follow any catalogue change.
 */

export type { FormState } from "./form-state";
export { INITIAL_FORM } from "./form-state";

export function str(formData: FormData, key: string, fallback = ""): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : fallback;
}

export function num(formData: FormData, key: string, fallback = 0): number {
  const raw = str(formData, key);
  if (raw === "") return fallback;
  const n = Number(raw.replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function bool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function list(formData: FormData, key: string): string[] {
  const all = formData.getAll(key).filter((v): v is string => typeof v === "string");
  // Accept both repeated fields and a single comma/newline separated value.
  return [...new Set(all.flatMap((v) => v.split(/[\n,]/)).map((v) => v.trim()).filter(Boolean))];
}

export function lines(formData: FormData, key: string): string[] {
  return str(formData, key)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function dateOrNull(formData: FormData, key: string): Date | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ---------------------------- Pagination ---------------------------- */

export interface ListParams {
  q: string;
  page: number;
  perPage: number;
  sort: string;
  dir: "asc" | "desc";
  filters: Record<string, string>;
}

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseListParams(
  raw: RawParams,
  options: { perPage?: number; defaultSort?: string; defaultDir?: "asc" | "desc"; filterKeys?: string[] } = {},
): ListParams {
  const page = Math.max(1, Number(first(raw.page)) || 1);
  const dirRaw = first(raw.dir);
  const filters: Record<string, string> = {};
  for (const key of options.filterKeys ?? []) {
    const v = first(raw[key]);
    if (v) filters[key] = v;
  }
  return {
    q: first(raw.q).trim(),
    page,
    perPage: options.perPage ?? 20,
    sort: first(raw.sort) || options.defaultSort || "createdAt",
    dir: dirRaw === "asc" || dirRaw === "desc" ? dirRaw : (options.defaultDir ?? "desc"),
    filters,
  };
}

export function skipTake(params: ListParams) {
  return { skip: (params.page - 1) * params.perPage, take: params.perPage };
}

export function pageMeta(total: number, params: ListParams) {
  return {
    total,
    page: params.page,
    perPage: params.perPage,
    totalPages: Math.max(1, Math.ceil(total / params.perPage)),
    from: total === 0 ? 0 : (params.page - 1) * params.perPage + 1,
    to: Math.min(total, params.page * params.perPage),
  };
}

export const insensitive = (value: string): Prisma.StringFilter => ({
  contains: value,
  mode: "insensitive",
});

/* --------------------------- Revalidation --------------------------- */

/**
 * Catalogue pages are cached (ISR). Any admin write that changes what a
 * shopper could see calls this so the storefront refreshes on the next hit.
 */
export function revalidateStorefront(paths: string[] = []) {
  revalidatePath("/", "layout");
  for (const p of paths) revalidatePath(p);
}

export function revalidateAdmin(section?: string) {
  revalidatePath("/admin", "layout");
  if (section) revalidatePath(`/admin/${section}`, "layout");
}
