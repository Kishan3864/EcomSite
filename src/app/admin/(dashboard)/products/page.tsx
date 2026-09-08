import Link from "next/link";
import Image from "next/image";
import { Archive, ArchiveRestore, Copy, ImageOff, Pencil, Plus, Trash2 } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm, ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  DateCell,
  EmptyRow,
  Money,
  PageHeader,
  Pill,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import { bulkSetProductStatus, deleteProduct, duplicateProduct, setProductStatus } from "@/services/admin/products-actions";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";
import { BulkBar, BulkProvider, RowCheckbox, SelectAllCheckbox } from "./bulk-actions";
import { PRODUCT_STATUSES, SORT_OPTIONS, STOCK_STATES } from "./product-schema";

export const metadata = { title: "Products" };

const LIST = "/admin/products";
const DEFAULT_SORT = "updated_desc";

function orderBy(sort: string): Prisma.ProductOrderByWithRelationInput[] {
  const [field, dirRaw] = sort.split("_");
  const dir: Prisma.SortOrder = dirRaw === "asc" ? "asc" : "desc";
  switch (field) {
    case "price":
      return [{ price: dir }, { title: "asc" }];
    case "stock":
      return [{ stock: dir }, { title: "asc" }];
    case "sold":
      return [{ soldCount: dir }, { title: "asc" }];
    case "title":
      return [{ title: dir }];
    default:
      return [{ updatedAt: dir }, { title: "asc" }];
  }
}

/**
 * Catalogue list. Every filter lives in the URL so other modules can deep-link
 * (`?brand=<slug>`, `?category=<slug>`, `?stock=low`) and a filtered view can
 * be bookmarked.
 */
export default async function ProductsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, {
    perPage: 25,
    defaultSort: DEFAULT_SORT,
    filterKeys: ["status", "category", "brand", "stock"],
  });
  const statusFilter = params.filters.status?.toUpperCase();
  const validStatus = (PRODUCT_STATUSES as readonly string[]).includes(statusFilter ?? "") ? statusFilter : undefined;
  const stockFilter = params.filters.stock;

  const where: Prisma.ProductWhereInput = {
    ...(params.q
      ? {
          OR: [
            { title: insensitive(params.q) },
            { sku: insensitive(params.q) },
            { slug: insensitive(params.q) },
            { brand: { name: insensitive(params.q) } },
          ],
        }
      : {}),
    ...(validStatus ? { status: validStatus as Prisma.ProductWhereInput["status"] } : {}),
    ...(params.filters.category ? { category: { slug: params.filters.category } } : {}),
    ...(params.filters.brand ? { brand: { slug: params.filters.brand } } : {}),
    ...(stockFilter === "in"
      ? { stock: { gt: db.product.fields.lowStockThreshold } }
      : stockFilter === "low"
        ? { stock: { gt: 0, lte: db.product.fields.lowStockThreshold } }
        : stockFilter === "out"
          ? { stock: { lte: 0 } }
          : {}),
  };

  const [rows, total, categories, brands, statusCounts] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: orderBy(params.sort),
      select: {
        id: true,
        title: true,
        sku: true,
        slug: true,
        status: true,
        price: true,
        mrp: true,
        stock: true,
        lowStockThreshold: true,
        updatedAt: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        subcategory: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
        _count: { select: { orderLines: true } },
      },
      ...skipTake(params),
    }),
    db.product.count({ where }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    db.product.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countOf = (status: string) => statusCounts.find((s) => s.status === status)?._count._all ?? 0;
  const meta = pageMeta(total, params);
  const current = {
    q: params.q || undefined,
    status: params.filters.status,
    category: params.filters.category,
    brand: params.filters.brand,
    stock: params.filters.stock,
    sort: params.sort === DEFAULT_SORT ? undefined : params.sort,
  };
  const returnTo = withParams(LIST, current, { page: params.page > 1 ? params.page : null });
  const filtered = Boolean(params.q || validStatus || params.filters.category || params.filters.brand || stockFilter);
  const canManage = hasRole(session, "MANAGER");
  const canDelete = hasRole(session, "OWNER");
  const pageIds = rows.map((r) => r.id);
  const colSpan = canManage ? 9 : 8;

  const iconBtn = "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900";

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything in the catalogue — drafts, live listings and archived items. Stock and price shown here are what shoppers see."
        actions={
          canManage && (
            <Link href={`${LIST}/new`} className={buttonClasses("primary", "sm")}>
              <Plus size={15} /> New product
            </Link>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search title, SKU, slug or brand…" defaultValue={params.q} className="w-full sm:w-80" />
        <ParamSelect
          name="status"
          value={params.filters.status}
          allLabel={`All statuses (${countOf("DRAFT") + countOf("ACTIVE") + countOf("ARCHIVED")})`}
          options={[
            { value: "ACTIVE", label: `Active (${countOf("ACTIVE")})` },
            { value: "DRAFT", label: `Draft (${countOf("DRAFT")})` },
            { value: "ARCHIVED", label: `Archived (${countOf("ARCHIVED")})` },
          ]}
        />
        <ParamSelect
          name="category"
          value={params.filters.category}
          allLabel="All categories"
          options={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />
        <ParamSelect
          name="brand"
          value={params.filters.brand}
          allLabel="All brands"
          options={brands.map((b) => ({ value: b.slug, label: b.name }))}
        />
        <ParamSelect name="stock" value={params.filters.stock} allLabel="All stock states" options={[...STOCK_STATES]} />
        <ParamSelect
          name="sort"
          value={params.sort === DEFAULT_SORT ? "" : params.sort}
          allLabel="Recently updated"
          options={[...SORT_OPTIONS]}
          className="sm:ml-auto"
        />
      </div>

      <BulkProvider key={returnTo}>
        {canManage && <BulkBar action={bulkSetProductStatus} returnTo={returnTo} />}

        <Table>
          <thead>
            <tr>
              {canManage && (
                <Th className="w-10">
                  <SelectAllCheckbox ids={pageIds} />
                </Th>
              )}
              <Th>Product</Th>
              <Th>Brand</Th>
              <Th>Category</Th>
              <Th align="right">Price</Th>
              <Th align="right">Stock</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={colSpan}
                title={filtered ? "No products match" : "No products yet"}
                body={filtered ? "Try a different search or clear a filter." : "Create your first product to start selling."}
              />
            ) : (
              rows.map((p) => {
                const thumb = p.images[0];
                const low = p.stock <= p.lowStockThreshold;
                const out = p.stock <= 0;
                return (
                  <Tr key={p.id}>
                    {canManage && (
                      <Td>
                        <RowCheckbox id={p.id} label={p.title} />
                      </Td>
                    )}
                    <Td>
                      <div className="flex items-center gap-3">
                        {thumb ? (
                          <Image
                            src={thumb.url}
                            alt={thumb.alt || p.title}
                            width={40}
                            height={40}
                            unoptimized
                            className="h-10 w-10 shrink-0 rounded-md border border-hairline object-cover"
                          />
                        ) : (
                          <span
                            title="No image"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-ink-200 bg-canvas text-ink-300"
                          >
                            <ImageOff size={15} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <Link href={`${LIST}/${p.id}`} className="block max-w-[320px] truncate font-medium text-ink-950 hover:text-brand-700">
                            {p.title}
                          </Link>
                          <span className="block font-mono text-[11.5px] text-ink-400">{p.sku}</span>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Link href={withParams(LIST, current, { brand: p.brand.slug, page: null })} className="text-ink-700 hover:text-brand-700">
                        {p.brand.name}
                      </Link>
                    </Td>
                    <Td>
                      <Link href={withParams(LIST, current, { category: p.category.slug, page: null })} className="text-ink-700 hover:text-brand-700">
                        {p.category.name}
                      </Link>
                      <span className="block text-[11.5px] text-ink-400">{p.subcategory.name}</span>
                    </Td>
                    <Td align="right">
                      <Money value={p.price} className="font-medium text-ink-950" />
                      {p.mrp > p.price && (
                        <span className="block text-[11.5px] text-ink-400 line-through">
                          <Money value={p.mrp} />
                        </span>
                      )}
                    </Td>
                    <Td align="right">
                      <span className={cn("font-medium", out ? "text-sale-600" : low ? "text-sale-600" : "text-ink-900")}>{p.stock}</span>
                      {out ? (
                        <Pill tone="sale" className="ml-2">
                          Out
                        </Pill>
                      ) : low ? (
                        <Pill tone="gold" className="ml-2">
                          Low
                        </Pill>
                      ) : null}
                    </Td>
                    <Td>
                      <StatusPill status={p.status} />
                    </Td>
                    <Td>
                      <DateCell value={p.updatedAt} />
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Link href={`${LIST}/${p.id}`} title="Edit" className={iconBtn}>
                          <Pencil size={14} />
                        </Link>
                        {canManage && (
                          <>
                            <form action={duplicateProduct}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <button type="submit" title="Duplicate as draft" className={iconBtn}>
                                <Copy size={14} />
                              </button>
                            </form>
                            <form action={setProductStatus}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="returnTo" value={returnTo} />
                              <input type="hidden" name="status" value={p.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED"} />
                              <button
                                type="submit"
                                title={p.status === "ARCHIVED" ? "Unarchive (make active)" : "Archive"}
                                className={iconBtn}
                              >
                                {p.status === "ARCHIVED" ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                              </button>
                            </form>
                          </>
                        )}
                        {canDelete && p._count.orderLines === 0 && (
                          <ConfirmForm action={deleteProduct} message={`Delete ${p.title} (${p.sku})? This cannot be undone.`}>
                            <input type="hidden" name="id" value={p.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <button
                              type="submit"
                              title="Delete"
                              className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </ConfirmForm>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>
      </BulkProvider>

      <AdminPagination meta={meta} hrefFor={(p) => withParams(LIST, current, { page: p })} label="products" />
    </>
  );
}
