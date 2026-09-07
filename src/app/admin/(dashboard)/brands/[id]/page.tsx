import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { Card, DateCell, KeyValue, PageHeader, Pill } from "@/components/admin/ui";
import { updateBrand } from "@/services/admin/brands-actions";
import { BrandForm } from "../brand-form";

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("MANAGER");
  const { id } = await params;

  const brand = await db.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) notFound();

  // Bind the id so the client form only ever deals with (prevState, formData).
  const action = updateBrand.bind(null, brand.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <PageHeader
          title={brand.name}
          back={{ href: "/admin/brands", label: "Brands" }}
          meta={
            <>
              <Pill tone={brand.isActive ? "brand" : "neutral"} dot>
                {brand.isActive ? "Active" : "Inactive"}
              </Pill>
              <span className="text-[12px] text-ink-400">/{brand.slug}</span>
            </>
          }
          actions={
            <Link href={`/products?brands=${brand.slug}`} target="_blank" className={buttonClasses("outline", "sm")}>
              <ExternalLink size={14} /> View on storefront
            </Link>
          }
        />
        <BrandForm
          action={action}
          initial={{
            name: brand.name,
            slug: brand.slug,
            logoText: brand.logoText,
            tagline: brand.tagline,
            origin: brand.origin,
            description: brand.description ?? "",
            isActive: brand.isActive,
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
                  <Link href={`/admin/products?brand=${brand.slug}`} className="font-medium text-brand-700 hover:underline">
                    {brand._count.products} products
                  </Link>
                ),
              },
              { label: "Created", value: <DateCell value={brand.createdAt} /> },
              { label: "Updated", value: <DateCell value={brand.updatedAt} time /> },
            ]}
          />
        </Card>
      </aside>
    </div>
  );
}
