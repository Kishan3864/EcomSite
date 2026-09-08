import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { createSubcategory } from "@/services/admin/categories-actions";
import { SubcategoryForm } from "../../subcategory-form";

export default async function NewSubcategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("MANAGER");
  const { id } = await params;
  const category = await db.category.findUnique({ where: { id }, select: { id: true, name: true, slug: true } });
  if (!category) notFound();

  const action = createSubcategory.bind(null, category.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`New subcategory in ${category.name}`}
        description="It joins the end of the department's menu column and can hold products as soon as it is saved."
        back={{ href: `/admin/categories/${category.id}#subcategories`, label: category.name }}
      />
      <SubcategoryForm action={action} categorySlug={category.slug} submitLabel="Create subcategory" />
    </div>
  );
}
