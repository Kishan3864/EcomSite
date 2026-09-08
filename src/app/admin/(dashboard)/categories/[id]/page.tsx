import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm } from "@/components/admin/client";
import { Card, DateCell, EmptyRow, KeyValue, PageHeader, Pill, Table, Td, Th, Tr } from "@/components/admin/ui";
import {
  deleteCategory,
  deleteSubcategory,
  moveSubcategory,
  toggleSubcategoryActive,
  updateCategory,
} from "@/services/admin/categories-actions";
import { CategoryForm } from "../category-form";
import { CategoryIcon } from "../category-icon";

const iconBtn = "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900";
const iconBtnDisabled = "rounded-md p-1.5 text-ink-200";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin("MANAGER");
  const { id } = await params;

  const [category, brands] = await Promise.all([
    db.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, offers: true } },
        subcategories: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { _count: { select: { products: true } } },
        },
      },
    }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, isActive: true } }),
  ]);
  if (!category) notFound();

  const action = updateCategory.bind(null, category.id);
  const subs = category.subcategories;
  const canDelete = hasRole(session, "OWNER");
  const subProducts = subs.reduce((n, s) => n + s._count.products, 0);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <PageHeader
            title={category.name}
            back={{ href: "/admin/categories", label: "Categories" }}
            meta={
              <>
                <Pill tone={category.isActive ? "brand" : "neutral"} dot>
                  {category.isActive ? "Active" : "Hidden"}
                </Pill>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: `${category.accent}22`, color: category.accent }}
                >
                  <CategoryIcon name={category.icon} size={11} strokeWidth={2.5} /> {category.icon}
                </span>
                <span className="text-[12px] text-ink-400">/c/{category.slug}</span>
              </>
            }
            actions={
              <Link href={`/c/${category.slug}`} target="_blank" className={buttonClasses("outline", "sm")}>
                <ExternalLink size={14} /> View on storefront
              </Link>
            }
          />
          <CategoryForm
            action={action}
            brands={brands}
            initial={{
              name: category.name,
              slug: category.slug,
              menuLabel: category.menuLabel,
              icon: category.icon,
              accent: category.accent,
              description: category.description,
              imageUrl: category.imageUrl,
              imageAlt: category.imageAlt,
              highlights: category.highlights,
              featuredBrandSlugs: category.featuredBrandSlugs,
              sortOrder: category.sortOrder,
              isActive: category.isActive,
            }}
          />
        </div>

        <aside className="space-y-4">
          <Card title="At a glance">
            <KeyValue
              rows={[
                {
                  label: "Products",
                  value: (
                    <Link href={`/admin/products?category=${category.slug}`} className="font-medium text-brand-700 hover:underline">
                      {category._count.products} product{category._count.products === 1 ? "" : "s"}
                    </Link>
                  ),
                },
                {
                  label: "Subcategories",
                  value: (
                    <a href="#subcategories" className="font-medium text-brand-700 hover:underline">
                      {subs.length} ({subs.filter((s) => s.isActive).length} active)
                    </a>
                  ),
                },
                { label: "Offers scoped", value: `${category._count.offers}` },
                { label: "Menu position", value: `#${category.sortOrder + 1}` },
                { label: "Created", value: <DateCell value={category.createdAt} /> },
                { label: "Updated", value: <DateCell value={category.updatedAt} time /> },
              ]}
            />
          </Card>

          {canDelete && (
            <Card title="Danger zone">
              <p className="text-[12.5px] leading-relaxed text-ink-600">
                {category._count.products > 0 || subProducts > 0
                  ? `This category has ${Math.max(category._count.products, subProducts)} products. Move them to another category before deleting, or hide the category instead.`
                  : `Deleting removes the category and its ${subs.length} subcategor${subs.length === 1 ? "y" : "ies"}. Any offers scoped to it become store-wide.`}
              </p>
              <ConfirmForm
                action={deleteCategory}
                message={`Delete ${category.name}? This cannot be undone.`}
                className="mt-3 block"
              >
                <input type="hidden" name="id" value={category.id} />
                <button
                  type="submit"
                  disabled={category._count.products > 0 || subProducts > 0}
                  className={buttonClasses("danger", "sm", "w-full")}
                >
                  <Trash2 size={14} /> Delete category
                </button>
              </ConfirmForm>
            </Card>
          )}
        </aside>
      </div>

      <section id="subcategories" className="mt-8 scroll-mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[20px] tracking-[-0.02em] text-ink-950">Subcategories</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-500">
              The columns inside this department&apos;s menu panel. Every product sits in exactly one subcategory.
            </p>
          </div>
          <Link href={`/admin/categories/${category.id}/subcategories/new`} className={buttonClasses("primary", "sm")}>
            <Plus size={15} /> Add subcategory
          </Link>
        </div>

        <Table>
          <thead>
            <tr>
              <Th className="w-[88px]">Order</Th>
              <Th>Subcategory</Th>
              <Th>Description</Th>
              <Th align="right">Products</Th>
              <Th>Status</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <EmptyRow
                colSpan={6}
                title="No subcategories yet"
                body="Products cannot be added to this category until it has at least one subcategory."
              />
            ) : (
              subs.map((s, i) => (
                <Tr key={s.id}>
                  <Td>
                    <div className="flex items-center gap-1">
                      <span className="w-5 text-[12px] tabular-nums text-ink-400">{i + 1}</span>
                      <div className="flex flex-col">
                        <form action={moveSubcategory}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            title="Move up"
                            aria-label={`Move ${s.name} up`}
                            disabled={i === 0}
                            className={cn(i === 0 ? iconBtnDisabled : iconBtn, "p-0.5")}
                          >
                            <ArrowUp size={13} />
                          </button>
                        </form>
                        <form action={moveSubcategory}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            title="Move down"
                            aria-label={`Move ${s.name} down`}
                            disabled={i === subs.length - 1}
                            className={cn(i === subs.length - 1 ? iconBtnDisabled : iconBtn, "p-0.5")}
                          >
                            <ArrowDown size={13} />
                          </button>
                        </form>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Image
                        src={s.imageUrl}
                        alt={s.imageAlt}
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 shrink-0 rounded-md border border-hairline object-cover"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/admin/categories/${category.id}/subcategories/${s.id}`}
                          className="font-medium text-ink-950 hover:text-brand-700"
                        >
                          {s.name}
                        </Link>
                        <span className="block text-[11.5px] text-ink-400">
                          /c/{category.slug}/{s.slug}
                        </span>
                      </div>
                    </div>
                  </Td>
                  <Td className="max-w-[320px] truncate text-ink-600">{s.description}</Td>
                  <Td align="right">
                    <Link href={`/admin/products?subcategory=${s.slug}`} className="tabular-nums hover:text-brand-700">
                      {s._count.products}
                    </Link>
                  </Td>
                  <Td>
                    <Pill tone={s.isActive ? "brand" : "neutral"} dot>
                      {s.isActive ? "Active" : "Hidden"}
                    </Pill>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/categories/${category.id}/subcategories/${s.id}`}
                        title="Edit"
                        className={iconBtn}
                      >
                        <Pencil size={14} />
                      </Link>
                      <form action={toggleSubcategoryActive}>
                        <input type="hidden" name="id" value={s.id} />
                        <button type="submit" title={s.isActive ? "Hide from menu" : "Show in menu"} className={iconBtn}>
                          <Power size={14} />
                        </button>
                      </form>
                      {canDelete &&
                        (s._count.products > 0 ? (
                          <Link
                            href={`/admin/categories/${category.id}/subcategories/${s.id}#danger`}
                            title={`Has ${s._count.products} products — open to move them before deleting`}
                            className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-700"
                          >
                            <Trash2 size={14} />
                          </Link>
                        ) : (
                          <ConfirmForm action={deleteSubcategory} message={`Delete ${s.name}? This cannot be undone.`}>
                            <input type="hidden" name="id" value={s.id} />
                            <button
                              type="submit"
                              title="Delete"
                              className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </ConfirmForm>
                        ))}
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </section>
    </>
  );
}
