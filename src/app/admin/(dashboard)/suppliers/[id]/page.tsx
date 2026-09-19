import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/admin";
import {
  Card,
  DateCell,
  EmptyRow,
  KeyValue,
  Money,
  PageHeader,
  VisibilityPill,
  StatusPill,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/admin/ui";
import { updateSupplier } from "@/services/admin/suppliers-actions";
import { SupplierForm } from "../supplier-form";

export const metadata = { title: "Edit wholesaler" };

/** How many of this wholesaler's products to list inline before linking out. */
const RECENT = 20;

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("MANAGER");
  const { id } = await params;

  const supplier = await db.supplier.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
      // Explicit select: only what this page renders. Nothing here is
      // storefront-facing, but the habit is what keeps supplier data contained.
      products: {
        orderBy: { updatedAt: "desc" },
        take: RECENT,
        select: {
          id: true,
          title: true,
          sku: true,
          status: true,
          price: true,
          stock: true,
          brand: { select: { name: true } },
        },
      },
    },
  });
  if (!supplier) notFound();

  // Bind the id so the client form only ever deals with (prevState, formData).
  const action = updateSupplier.bind(null, supplier.id);
  const productCount = supplier._count.products;
  const productsHref = `/admin/products?supplier=${supplier.slug}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        <div>
          <PageHeader
            title={supplier.name}
            back={{ href: "/admin/suppliers", label: "Wholesalers" }}
            meta={
              <>
                <VisibilityPill own={supplier.isActive ? "active" : "hidden"} offWord="Inactive" />
                <span className="text-[12px] text-ink-400">/{supplier.slug}</span>
              </>
            }
          />
          <SupplierForm
            action={action}
            initial={{
              name: supplier.name,
              slug: supplier.slug,
              contactName: supplier.contactName,
              phone: supplier.phone,
              email: supplier.email ?? "",
              gstin: supplier.gstin ?? "",
              city: supplier.city ?? "",
              notes: supplier.notes ?? "",
              isActive: supplier.isActive,
            }}
          />
        </div>

        <Card
          title={productCount === 1 ? "1 product from this wholesaler" : `${productCount} products from this wholesaler`}
          description={
            productCount > RECENT
              ? `The ${RECENT} most recently edited are shown here.`
              : "Everything you have recorded as bought from them."
          }
          padded={false}
          actions={
            productCount > 0 && (
              <Link href={productsHref} className="text-[12.5px] font-semibold text-brand-700 hover:underline">
                {productCount > RECENT ? `See all ${productCount}` : "Open in Products"}
              </Link>
            )
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Brand</Th>
                <Th align="right">Price</Th>
                <Th align="right">Stock</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {supplier.products.length === 0 ? (
                <EmptyRow
                  colSpan={5}
                  title="Nothing sourced from them yet"
                  body="Pick this wholesaler under Pricing & stock on a product to record it here."
                />
              ) : (
                supplier.products.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <Link href={`/admin/products/${p.id}`} className="block max-w-[320px] truncate font-medium text-ink-950 hover:text-brand-700">
                        {p.title}
                      </Link>
                      <span className="block font-mono text-[11.5px] text-ink-400">{p.sku}</span>
                    </Td>
                    <Td className="text-ink-600">{p.brand.name}</Td>
                    <Td align="right">
                      <Money value={p.price} className="font-medium text-ink-950" />
                    </Td>
                    <Td align="right">{p.stock}</Td>
                    <Td>
                      <StatusPill status={p.status} />
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card title="At a glance">
          <KeyValue
            rows={[
              {
                label: "Products",
                value:
                  productCount > 0 ? (
                    <Link href={productsHref} className="font-medium text-brand-700 hover:underline">
                      {productCount} product{productCount > 1 ? "s" : ""}
                    </Link>
                  ) : (
                    "None yet"
                  ),
              },
              { label: "Contact", value: supplier.contactName },
              { label: "Phone", value: <span className="tabular-nums">{supplier.phone}</span> },
              ...(supplier.email ? [{ label: "Email", value: supplier.email }] : []),
              ...(supplier.city ? [{ label: "City", value: supplier.city }] : []),
              ...(supplier.gstin
                ? [{ label: "GSTIN", value: <span className="font-mono text-[12px]">{supplier.gstin}</span> }]
                : []),
              { label: "Added", value: <DateCell value={supplier.createdAt} /> },
              { label: "Updated", value: <DateCell value={supplier.updatedAt} time /> },
            ]}
          />
        </Card>
      </aside>
    </div>
  );
}
