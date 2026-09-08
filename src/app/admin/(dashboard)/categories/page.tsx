import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUp, Plus, Power, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm } from "@/components/admin/client";
import { EmptyRow, PageHeader, Pill, Table, Td, Th, Tr } from "@/components/admin/ui";
import { deleteCategory, moveCategory, toggleCategoryActive } from "@/services/admin/categories-actions";
import { CategoryIcon } from "./category-icon";

const iconBtn = "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900";
const iconBtnDisabled = "rounded-md p-1.5 text-ink-200";

/**
 * Categories are few (a handful of top-level departments) and their order is
 * the mega-menu order, so this page lists them all, sorted, with reordering
 * instead of search and pagination.
 */
export default async function CategoriesPage() {
  const session = await requireAdmin();

  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { products: true, subcategories: true } } },
  });

  const canEdit = hasRole(session, "MANAGER");
  const canDelete = hasRole(session, "OWNER");
  const active = rows.filter((r) => r.isActive).length;

  return (
    <>
      <PageHeader
        title="Categories"
        description="The departments shoppers browse by. The order here is the order of the header mega menu and the footer."
        meta={
          rows.length > 0 && (
            <span className="text-[12.5px] text-ink-500">
              {rows.length} categor{rows.length === 1 ? "y" : "ies"} · {active} live in the menu
            </span>
          )
        }
        actions={
          canEdit && (
            <Link href="/admin/categories/new" className={buttonClasses("primary", "sm")}>
              <Plus size={15} /> Add category
            </Link>
          )
        }
      />

      <Table>
        <thead>
          <tr>
            <Th className="w-[88px]">Order</Th>
            <Th>Category</Th>
            <Th>Menu label</Th>
            <Th align="right">Subcategories</Th>
            <Th align="right">Products</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={7}
              title="No categories yet"
              body="Add your first department — it appears in the header menu as soon as it is active."
            />
          ) : (
            rows.map((c, i) => (
              <Tr key={c.id}>
                <Td>
                  <div className="flex items-center gap-1">
                    <span className="w-5 text-[12px] tabular-nums text-ink-400">{i + 1}</span>
                    {canEdit ? (
                      <div className="flex flex-col">
                        <form action={moveCategory}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            title="Move up"
                            aria-label={`Move ${c.name} up`}
                            disabled={i === 0}
                            className={cn(i === 0 ? iconBtnDisabled : iconBtn, "p-0.5")}
                          >
                            <ArrowUp size={13} />
                          </button>
                        </form>
                        <form action={moveCategory}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            title="Move down"
                            aria-label={`Move ${c.name} down`}
                            disabled={i === rows.length - 1}
                            className={cn(i === rows.length - 1 ? iconBtnDisabled : iconBtn, "p-0.5")}
                          >
                            <ArrowDown size={13} />
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    <Image
                      src={c.imageUrl}
                      alt={c.imageAlt}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 shrink-0 rounded-lg border border-hairline object-cover"
                    />
                    <div className="min-w-0">
                      <Link href={`/admin/categories/${c.id}`} className="font-medium text-ink-950 hover:text-brand-700">
                        {c.name}
                      </Link>
                      <span className="flex items-center gap-1.5 text-[11.5px] text-ink-400">
                        <span
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${c.accent}22`, color: c.accent }}
                          title={`Icon: ${c.icon} · Accent: ${c.accent}`}
                        >
                          <CategoryIcon name={c.icon} size={10} strokeWidth={2.5} />
                        </span>
                        /c/{c.slug}
                      </span>
                    </div>
                  </div>
                </Td>
                <Td className="text-ink-700">{c.menuLabel}</Td>
                <Td align="right">
                  <Link href={`/admin/categories/${c.id}#subcategories`} className="tabular-nums hover:text-brand-700">
                    {c._count.subcategories}
                  </Link>
                </Td>
                <Td align="right">
                  <Link href={`/admin/products?category=${c.slug}`} className="tabular-nums hover:text-brand-700">
                    {c._count.products}
                  </Link>
                </Td>
                <Td>
                  <Pill tone={c.isActive ? "brand" : "neutral"} dot>
                    {c.isActive ? "Active" : "Hidden"}
                  </Pill>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    {canEdit && (
                      <form action={toggleCategoryActive}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" title={c.isActive ? "Hide from menu" : "Show in menu"} className={iconBtn}>
                          <Power size={14} />
                        </button>
                      </form>
                    )}
                    {canDelete && (
                      <ConfirmForm
                        action={deleteCategory}
                        message={
                          c._count.products > 0
                            ? `${c.name} still has ${c._count.products} products, so it cannot be deleted yet. Try anyway?`
                            : `Delete ${c.name} and its ${c._count.subcategories} subcategories? This cannot be undone.`
                        }
                      >
                        <input type="hidden" name="id" value={c.id} />
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
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
