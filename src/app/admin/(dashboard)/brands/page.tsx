import Link from "next/link";
import { Plus, Power, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin, hasRole } from "@/lib/auth/admin";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm, ParamSelect, SearchBox } from "@/components/admin/client";
import {
  AdminPagination,
  EmptyRow,
  PageHeader,
  Pill,
  Table,
  Td,
  Th,
  Tr,
  withParams,
} from "@/components/admin/ui";
import { deleteBrand, toggleBrandActive } from "@/services/admin/brands-actions";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";

/**
 * Reference admin list page. URL search params drive everything (search,
 * filter, page) so the state is shareable and the back button works.
 */
export default async function BrandsPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 20, defaultSort: "name", defaultDir: "asc", filterKeys: ["status"] });

  const where = {
    ...(params.q
      ? { OR: [{ name: insensitive(params.q) }, { slug: insensitive(params.q) }, { origin: insensitive(params.q) }] }
      : {}),
    ...(params.filters.status === "active" ? { isActive: true } : {}),
    ...(params.filters.status === "inactive" ? { isActive: false } : {}),
  };

  const [rows, total] = await Promise.all([
    db.brand.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
      ...skipTake(params),
    }),
    db.brand.count({ where }),
  ]);
  const meta = pageMeta(total, params);
  const current = { q: params.q || undefined, status: params.filters.status };

  return (
    <>
      <PageHeader
        title="Brands"
        description="The studios and makers behind the catalogue. Every product belongs to exactly one brand."
        actions={
          hasRole(session, "MANAGER") && (
            <Link href="/admin/brands/new" className={buttonClasses("primary", "sm")}>
              <Plus size={15} /> New brand
            </Link>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search brands…" defaultValue={params.q} className="w-full sm:w-72" />
        <ParamSelect
          name="status"
          value={params.filters.status}
          allLabel="All statuses"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Brand</Th>
            <Th>Based in</Th>
            <Th>Tagline</Th>
            <Th align="right">Products</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={6} title="No brands match" body="Try a different search, or add a new brand." />
          ) : (
            rows.map((b) => (
              <Tr key={b.id}>
                <Td>
                  <Link href={`/admin/brands/${b.id}`} className="font-medium text-ink-950 hover:text-brand-700">
                    {b.name}
                  </Link>
                  <span className="block text-[11.5px] text-ink-400">/{b.slug}</span>
                </Td>
                <Td>{b.origin}</Td>
                <Td className="max-w-[280px] truncate text-ink-600">{b.tagline}</Td>
                <Td align="right">
                  <Link href={`/admin/products?brand=${b.slug}`} className="tabular-nums hover:text-brand-700">
                    {b._count.products}
                  </Link>
                </Td>
                <Td>
                  <Pill tone={b.isActive ? "brand" : "neutral"} dot>
                    {b.isActive ? "Active" : "Inactive"}
                  </Pill>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    {hasRole(session, "MANAGER") && (
                      <form action={toggleBrandActive}>
                        <input type="hidden" name="id" value={b.id} />
                        <button
                          type="submit"
                          title={b.isActive ? "Deactivate" : "Activate"}
                          className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
                        >
                          <Power size={14} />
                        </button>
                      </form>
                    )}
                    {hasRole(session, "OWNER") && (
                      <ConfirmForm action={deleteBrand} message={`Delete ${b.name}? This cannot be undone.`}>
                        <input type="hidden" name="id" value={b.id} />
                        <button
                          type="submit"
                          title="Delete"
                          className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </ConfirmForm>
                    )}
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      <AdminPagination meta={meta} hrefFor={(p) => withParams("/admin/brands", current, { page: p })} label="brands" />
    </>
  );
}
