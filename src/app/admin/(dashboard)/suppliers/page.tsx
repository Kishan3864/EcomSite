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
import { deleteSupplier, toggleSupplierActive } from "@/services/admin/suppliers-actions";
import { insensitive, pageMeta, parseListParams, skipTake, type RawParams } from "@/services/admin/shared";
import { Form } from "@/components/ui/form";

export const metadata = { title: "Wholesalers" };

const LIST = "/admin/suppliers";

/**
 * Where every product was bought from. Admin-only bookkeeping — no part of a
 * supplier reaches the storefront, by design.
 */
export default async function SuppliersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseListParams(raw, { perPage: 20, defaultSort: "name", defaultDir: "asc", filterKeys: ["status"] });

  const where = {
    ...(params.q
      ? {
          OR: [
            { name: insensitive(params.q) },
            { slug: insensitive(params.q) },
            { contactName: insensitive(params.q) },
            { phone: insensitive(params.q) },
            { city: insensitive(params.q) },
          ],
        }
      : {}),
    ...(params.filters.status === "active" ? { isActive: true } : {}),
    ...(params.filters.status === "inactive" ? { isActive: false } : {}),
  };

  const [rows, total] = await Promise.all([
    db.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
      ...skipTake(params),
    }),
    db.supplier.count({ where }),
  ]);
  const meta = pageMeta(total, params);
  const current = { q: params.q || undefined, status: params.filters.status };

  return (
    <>
      <PageHeader
        title="Wholesalers"
        description="Who you buy from. Recorded against each product so you can tell months later where it came from — and never shown on the storefront."
        actions={
          hasRole(session, "MANAGER") && (
            <Link href={`${LIST}/new`} className={buttonClasses("primary", "sm")}>
              <Plus size={15} /> New wholesaler
            </Link>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search name, contact, phone or city…" defaultValue={params.q} className="w-full sm:w-80" />
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
            <Th>Wholesaler</Th>
            <Th>Contact</Th>
            <Th>City</Th>
            <Th align="right">Products</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow
              colSpan={6}
              title={params.q || params.filters.status ? "No wholesalers match" : "No wholesalers yet"}
              body={
                params.q || params.filters.status
                  ? "Try a different search, or clear the filter."
                  : "Add the wholesalers you buy from, then pick one on each product."
              }
            />
          ) : (
            rows.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <Link href={`${LIST}/${s.id}`} className="font-medium text-ink-950 hover:text-brand-700">
                    {s.name}
                  </Link>
                  <span className="block text-[11.5px] text-ink-400">/{s.slug}</span>
                </Td>
                <Td>
                  <span className="block text-ink-800">{s.contactName}</span>
                  <span className="block text-[11.5px] tabular-nums text-ink-400">{s.phone}</span>
                </Td>
                <Td className="text-ink-600">{s.city ?? "—"}</Td>
                <Td align="right">
                  <Link href={`/admin/products?supplier=${s.slug}`} className="tabular-nums hover:text-brand-700">
                    {s._count.products}
                  </Link>
                </Td>
                <Td>
                  <Pill tone={s.isActive ? "brand" : "neutral"} dot>
                    {s.isActive ? "Active" : "Inactive"}
                  </Pill>
                </Td>
                <Td align="right">
                  <div className="flex items-center justify-end gap-1">
                    {hasRole(session, "MANAGER") && (
                      <Form action={toggleSupplierActive}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          title={s.isActive ? "Deactivate" : "Activate"}
                          className="p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
                        >
                          <Power size={14} />
                        </button>
                      </Form>
                    )}
                    {hasRole(session, "OWNER") && (
                      <ConfirmForm
                        action={deleteSupplier}
                        message={`Delete ${s.name}? This cannot be undone. Wholesalers you have stopped using are better deactivated, so their products keep their history.`}
                      >
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          title="Delete"
                          className="p-1.5 text-ink-400 transition-colors hover:bg-sale-50 hover:text-sale-600"
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

      <AdminPagination meta={meta} hrefFor={(p) => withParams(LIST, current, { page: p })} label="wholesalers" />
    </>
  );
}
