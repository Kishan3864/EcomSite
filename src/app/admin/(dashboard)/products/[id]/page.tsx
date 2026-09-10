import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, ExternalLink, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm } from "@/components/admin/client";
import { Card, DateCell, KeyValue, PageHeader, StatusPill } from "@/components/admin/ui";
import { deleteProduct, setProductStatus, updateProduct } from "@/services/admin/products-actions";
import { cn, formatCompact, formatINR } from "@/lib/utils";
import { loadProductFormOptions } from "../form-options";
import { ProductForm } from "../product-form";
import type {
  ImageInput,
  SpecGroupInput,
  VariantGroupInput,
  VariantTypeValue,
} from "../product-schema";
import { Form } from "@/components/ui/form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;

  const [product, options] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variantGroups: {
          orderBy: { sortOrder: "asc" },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        },
        relationsFrom: { orderBy: { sortOrder: "asc" }, select: { relatedId: true, kind: true } },
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        brand: { select: { name: true } },
        stockMoves: { orderBy: { createdAt: "desc" }, take: 5 },
        _count: { select: { orderLines: true, reviews: true } },
      },
    }),
    loadProductFormOptions(),
  ]);
  if (!product) notFound();

  const canEdit = hasRole(session, "MANAGER");
  // Bind the id so the client form only ever deals with (prevState, formData).
  const action = updateProduct.bind(null, product.id);

  const initial = {
    title: product.title,
    slug: product.slug,
    sku: product.sku,
    subtitle: product.subtitle,
    description: product.description,
    status: product.status,
    price: product.price,
    mrp: product.mrp,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    // The form posts every field it renders and the action writes the lot, so
    // anything missing here is silently cleared on the next save.
    hsnCode: product.hsnCode ?? "",
    taxRate: (product.taxRate ?? "") as number | "",
    uqc: product.uqc ?? "",
    badges: product.badges as string[],
    tags: product.tags,
    colors: product.colors,
    highlights: product.highlights,
    specifications: (product.specifications as unknown as SpecGroupInput[]) ?? [],
    deliveryDays: product.deliveryDays,
    codAvailable: product.codAvailable,
    returnWindowDays: product.returnWindowDays,
    warranty: product.warranty,
    freeShipping: product.freeShipping,
    videoPoster: product.videoPoster ?? "",
    metaTitle: product.metaTitle ?? "",
    metaDescription: product.metaDescription ?? "",
    brandId: product.brandId,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    images: product.images.map((i): ImageInput => ({ url: i.url, alt: i.alt })),
    variantGroups: product.variantGroups.map(
      (g): VariantGroupInput => ({
        name: g.name,
        type: g.type as VariantTypeValue,
        options: g.options.map((o) => ({
          label: o.label,
          value: o.value,
          swatch: o.swatch ?? "",
          priceDelta: o.priceDelta,
          inStock: o.inStock,
        })),
      }),
    ),
    relatedIds: product.relationsFrom.filter((r) => r.kind === "RELATED").map((r) => r.relatedId),
    bundleIds: product.relationsFrom.filter((r) => r.kind === "BUNDLE").map((r) => r.relatedId),
  };

  const archived = product.status === "ARCHIVED";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <PageHeader
          title={product.title}
          back={{ href: "/admin/products", label: "Products" }}
          meta={
            <>
              <StatusPill status={product.status} />
              <span className="font-mono text-[12px] text-ink-500">{product.sku}</span>
              <span className="text-[12px] text-ink-400">/{product.slug}</span>
            </>
          }
          actions={
            product.status === "ACTIVE" && (
              <Link
                href={`/p/${product.slug}`}
                target="_blank"
                className={buttonClasses("outline", "sm")}
              >
                <ExternalLink size={14} /> View on storefront
              </Link>
            )
          }
        />
        <ProductForm
          action={action}
          initial={initial}
          options={options}
          selfId={product.id}
          readOnly={!canEdit}
        />
      </div>

      <aside className="space-y-4">
        <Card title="At a glance">
          <KeyValue
            rows={[
              { label: "Brand", value: product.brand.name },
              {
                label: "Category",
                value: `${product.category.name} → ${product.subcategory.name}`,
              },
              { label: "Price", value: formatINR(product.price) },
              {
                label: "Stock",
                value: (
                  <Link
                    href={`/admin/inventory/${product.id}`}
                    className={cn(
                      "font-semibold hover:underline",
                      product.stock === 0
                        ? "text-sale-600"
                        : product.stock <= product.lowStockThreshold
                          ? "text-gold-700"
                          : "text-ink-900",
                    )}
                  >
                    {product.stock} units
                  </Link>
                ),
              },
              { label: "Units sold", value: formatCompact(product.soldCount) },
              {
                label: "Rating",
                value:
                  product.reviewCount > 0
                    ? `${product.rating.toFixed(1)} from ${product.reviewCount} reviews`
                    : "No reviews yet",
              },
              { label: "In orders", value: `${product._count.orderLines} order lines` },
              { label: "Created", value: <DateCell value={product.createdAt} /> },
              { label: "Updated", value: <DateCell value={product.updatedAt} time /> },
            ]}
          />
        </Card>

        <Card
          title="Recent stock movements"
          padded={false}
          actions={
            <Link
              href={`/admin/inventory/${product.id}`}
              className="text-[12.5px] font-semibold text-brand-700 hover:underline"
            >
              Full ledger
            </Link>
          }
        >
          {product.stockMoves.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-ink-400">No movements recorded yet.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {product.stockMoves.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-5 py-2.5">
                  <span
                    className={cn(
                      "shrink-0 text-[13px] font-semibold tabular-nums",
                      m.delta >= 0 ? "text-brand-700" : "text-sale-600",
                    )}
                  >
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-ink-800">{m.reason}</span>
                    <span className="block text-[11.5px] text-ink-400">
                      <DateCell value={m.createdAt} /> · {m.actorName ?? "System"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canEdit && (
          <Card title="Danger zone">
            <div className="space-y-3">
              <div>
                <Form action={setProductStatus}>
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="status" value={archived ? "DRAFT" : "ARCHIVED"} />
                  <button type="submit" className={buttonClasses("outline", "sm", "w-full")}>
                    {archived ? (
                      <>
                        <ArchiveRestore size={14} /> Restore as draft
                      </>
                    ) : (
                      <>
                        <Archive size={14} /> Archive product
                      </>
                    )}
                  </button>
                </Form>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
                  {archived
                    ? "Brings it back as a draft so you can review before going live."
                    : "Hides it everywhere but keeps it on past orders. Reversible."}
                </p>
              </div>

              {hasRole(session, "OWNER") && (
                <div className="border-t border-hairline pt-3">
                  <ConfirmForm
                    action={deleteProduct}
                    message={`Delete ${product.title} permanently? This cannot be undone.`}
                    className="block"
                  >
                    <input type="hidden" name="id" value={product.id} />
                    <button
                      type="submit"
                      disabled={product._count.orderLines > 0}
                      className={buttonClasses("outline", "sm", "w-full border-sale-300 text-sale-600 hover:border-sale-500 hover:bg-sale-50 disabled:opacity-50")}
                    >
                      <Trash2 size={14} /> Delete permanently
                    </button>
                  </ConfirmForm>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">
                    {product._count.orderLines > 0
                      ? `Cannot delete — this product appears on ${product._count.orderLines} order line${product._count.orderLines > 1 ? "s" : ""}. Archive it instead.`
                      : "Removes the product and its images, variants and reviews."}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}
