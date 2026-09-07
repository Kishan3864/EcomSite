import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { createBrand } from "@/services/admin/brands-actions";
import { BrandForm } from "../brand-form";

export default async function NewBrandPage() {
  await requireAdmin("MANAGER");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New brand"
        description="Add a maker or studio. Products can be assigned to it as soon as it is saved."
        back={{ href: "/admin/brands", label: "Brands" }}
      />
      <BrandForm action={createBrand} submitLabel="Create brand" />
    </div>
  );
}
