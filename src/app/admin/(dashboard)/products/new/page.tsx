import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/ui";
import { createProduct } from "@/services/admin/products-actions";
import { loadProductFormOptions } from "../form-options";
import { ProductForm } from "../product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin("MANAGER");
  const options = await loadProductFormOptions();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="New product"
        description="Start as a draft, add images and stock, then set it active when it is ready for shoppers."
        back={{ href: "/admin/products", label: "Products" }}
      />
      <ProductForm action={createProduct} options={options} submitLabel="Create product" />
    </div>
  );
}
