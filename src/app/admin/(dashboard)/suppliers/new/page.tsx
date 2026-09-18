import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { createSupplier } from "@/services/admin/suppliers-actions";
import { SupplierForm } from "../supplier-form";

export const metadata = { title: "New wholesaler" };

export default async function NewSupplierPage() {
  await requireAdmin("MANAGER");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New wholesaler"
        description="Add someone you buy from. They appear in the product form's wholesaler picker as soon as this is saved."
        back={{ href: "/admin/suppliers", label: "Wholesalers" }}
      />
      <SupplierForm action={createSupplier} submitLabel="Add wholesaler" />
    </div>
  );
}
