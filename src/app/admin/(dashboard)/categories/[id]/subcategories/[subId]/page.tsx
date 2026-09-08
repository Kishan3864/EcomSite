import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm } from "@/components/admin/client";
import { Card, DateCell, KeyValue, Label, PageHeader, Pill, selectArrow, selectCls } from "@/components/admin/ui";
import { deleteSubcategory, updateSubcategory } from "@/services/admin/categories-actions";
import { SubcategoryForm } from "../../subcategory-form";

export default async function EditSubcategoryPage({ params }: { params: Promise<{ id: string; subId: string }> }) {
  const session = await requireAdmin("MANAGER");
  const { id, subId } = await params;

  const sub = await db.subcategory.findFirst({
    where: { id: subId, categoryId: id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          subcategories: { where: { NOT: { id: subId } }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } },
        },
      },
      _count: { select: { products: true } },
    },
  });
  if (!sub) notFound();

  const action = updateSubcategory.bind(null, sub.category.id, sub.id);
  const siblings = sub.category.subcategories;
  const products = sub._count.products;
  const canDelete = hasRole(session, "OWNER");
  const back = `/admin/categories/${sub.category.id}#subcategories`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <PageHeader
          title={sub.name}
          back={{ href: back, label: sub.category.name }}
          meta={
            <>
              <Pill tone={sub.isActive ? "brand" : "neutral"} dot>
                {sub.isActive ? "Active" : "Hidden"}
              </Pill>
              <span className="text-[12px] text-ink-400">
                /c/{sub.category.slug}/{sub.slug}
              </span>
            </>
          }
          actions={
            <Link href={`/c/${sub.category.slug}/${sub.slug}`} target="_blank" className={buttonClasses("outline", "sm")}>
              <ExternalLink size={14} /> View on storefront
            </Link>
          }
        />
        <SubcategoryForm
          action={action}
          categorySlug={sub.category.slug}
          initial={{
            name: sub.name,
            slug: sub.slug,
            description: sub.description,
            imageUrl: sub.imageUrl,
            imageAlt: sub.imageAlt,
            sortOrder: sub.sortOrder,
            isActive: sub.isActive,
          }}
        />
      </div>

      <aside className="space-y-4">
        <Card title="At a glance">
          <KeyValue
            rows={[
              {
                label: "Category",
                value: (
                  <Link href={`/admin/categories/${sub.category.id}`} className="font-medium text-brand-700 hover:underline">
                    {sub.category.name}
                  </Link>
                ),
              },
              {
                label: "Products",
                value: (
                  <Link href={`/admin/products?subcategory=${sub.slug}`} className="font-medium text-brand-700 hover:underline">
                    {products} product{products === 1 ? "" : "s"}
                  </Link>
                ),
              },
              { label: "Position", value: `#${sub.sortOrder + 1}` },
              { label: "Created", value: <DateCell value={sub.createdAt} /> },
              { label: "Updated", value: <DateCell value={sub.updatedAt} time /> },
            ]}
          />
        </Card>

        {canDelete && (
          <Card title="Danger zone" className="scroll-mt-6">
            <div id="danger">
              {products === 0 ? (
                <p className="text-[12.5px] leading-relaxed text-ink-600">
                  This subcategory has no products, so it can be deleted safely. This cannot be undone.
                </p>
              ) : siblings.length === 0 ? (
                <p className="text-[12.5px] leading-relaxed text-ink-600">
                  {products} product{products === 1 ? "" : "s"} live here and there is no other subcategory in{" "}
                  {sub.category.name} to move them to. Add another subcategory first, or hide this one instead.
                </p>
              ) : (
                <p className="text-[12.5px] leading-relaxed text-ink-600">
                  {products} product{products === 1 ? "" : "s"} live here. Choose where they should go; they move as part of the delete.
                </p>
              )}

              <ConfirmForm
                action={deleteSubcategory}
                message={
                  products === 0
                    ? `Delete ${sub.name}? This cannot be undone.`
                    : `Delete ${sub.name} and move its ${products} product${products === 1 ? "" : "s"} to the chosen subcategory?`
                }
                className="mt-3 grid gap-3"
              >
                <input type="hidden" name="id" value={sub.id} />
                {products > 0 && siblings.length > 0 && (
                  <div>
                    <Label htmlFor="sub-move-to">Move products to</Label>
                    <select id="sub-move-to" name="moveTo" className={selectCls} style={selectArrow} required defaultValue="">
                      <option value="" disabled>
                        Choose a subcategory…
                      </option>
                      {siblings.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={products > 0 && siblings.length === 0}
                  className={buttonClasses("danger", "sm", "w-full")}
                >
                  <Trash2 size={14} /> {products > 0 ? "Move products & delete" : "Delete subcategory"}
                </button>
              </ConfirmForm>
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}
