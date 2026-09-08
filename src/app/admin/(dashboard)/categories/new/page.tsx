import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { createCategory } from "@/services/admin/categories-actions";
import { CategoryForm } from "../category-form";

export default async function NewCategoryPage() {
  await requireAdmin("MANAGER");
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, isActive: true },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="New category"
        description="Add a department. It joins the end of the menu; add subcategories once it is saved."
        back={{ href: "/admin/categories", label: "Categories" }}
      />
      <CategoryForm action={createCategory} brands={brands} submitLabel="Create category" />
    </div>
  );
}
