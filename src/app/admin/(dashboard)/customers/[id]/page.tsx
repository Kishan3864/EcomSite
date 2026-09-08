import Link from "next/link";
import { notFound } from "next/navigation";
import { KeyRound, Mail, Package, Power, Receipt, RotateCcw, ShieldOff, Star, TrendingUp } from "lucide-react";
import type { AddressLabel, PaymentMethod } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireAdmin } from "@/lib/auth/admin";
import { cn, formatINR } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmForm, CopyButton, Notice } from "@/components/admin/client";
import { Card, DateCell, KeyValue, Money, PageHeader, Pill, StatCard, StatusPill, Td, Th, Tr } from "@/components/admin/ui";
import { anonymiseCustomer, setCustomerActive, updateCustomer } from "@/services/admin/customers-actions";
import { CustomerForm } from "../customer-form";
import { TierPill, isAnonymised, tierLabel } from "../customer-meta";

const RECENT = 25;

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  UPI: "UPI",
  CARD: "Card",
  NETBANKING: "Net banking",
  WALLET: "Wallet",
  COD: "Cash on delivery",
};

const ADDRESS_LABEL: Record<AddressLabel, string> = { HOME: "Home", WORK: "Work", OTHER: "Other" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      orders: {
        orderBy: { placedAt: "desc" },
        take: RECENT,
        include: { _count: { select: { lines: true } } },
      },
      returns: {
        orderBy: { requestedAt: "desc" },
        take: RECENT,
        include: {
          order: { select: { id: true, number: true } },
          orderLine: { select: { title: true, variantLabel: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: RECENT,
        include: { product: { select: { id: true, title: true } } },
      },
      _count: { select: { orders: true, returns: true, reviews: true } },
    },
  });
  if (!customer) notFound();

  const [spendAgg, refundAgg] = await Promise.all([
    db.order.aggregate({
      where: { customerId: id, status: { not: "CANCELLED" } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.returnRequest.aggregate({ where: { customerId: id, status: "REFUNDED" }, _sum: { refundAmount: true } }),
  ]);
  const orderCount = spendAgg._count._all;
  const spend = spendAgg._sum.total ?? 0;
  const aov = orderCount > 0 ? Math.round(spend / orderCount) : 0;
  const refunded = refundAgg._sum.refundAmount ?? 0;
  const cancelled = customer._count.orders - orderCount;

  const anon = isAnonymised(customer);
  const guest = !customer.passwordHash;
  const canEdit = hasRole(session, "MANAGER") && !anon;
  const detailHref = `/admin/customers/${customer.id}`;
  const action = updateCustomer.bind(null, customer.id);

  return (
    <>
      <PageHeader
        title={customer.name}
        back={{ href: "/admin/customers", label: "Customers" }}
        meta={
          <>
            <TierPill tier={customer.tier} />
            <Pill tone={customer.isActive ? "brand" : "neutral"} dot>
              {customer.isActive ? "Active" : "Inactive"}
            </Pill>
            {anon ? (
              <Pill tone="ink">Anonymised</Pill>
            ) : (
              <Pill tone={guest ? "neutral" : "sky"}>{guest ? "Guest checkout" : "Has account"}</Pill>
            )}
            <span className="text-[12px] text-ink-400">Customer since {customer.createdAt.getFullYear()}</span>
          </>
        }
        actions={
          !anon && (
            <a href={`mailto:${customer.email}`} className={buttonClasses("outline", "sm")}>
              <Mail size={14} /> Email customer
            </a>
          )
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders"
          value={orderCount}
          hint={cancelled > 0 ? `${cancelled} cancelled not counted` : "Excludes cancelled orders"}
          icon={<Package size={16} />}
        />
        <StatCard label="Lifetime spend" value={formatINR(spend)} hint="Order totals incl. shipping" icon={<TrendingUp size={16} />} />
        <StatCard
          label="Average order"
          value={formatINR(aov)}
          hint={orderCount > 0 ? "Spend ÷ orders" : "No orders yet"}
          icon={<Receipt size={16} />}
        />
        <StatCard
          label="Returns"
          value={customer._count.returns}
          hint={refunded > 0 ? `${formatINR(refunded)} refunded` : "Nothing refunded"}
          icon={<RotateCcw size={16} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6">
          {canEdit ? (
            <CustomerForm
              action={action}
              initial={{
                name: customer.name,
                phone: customer.phone ?? "",
                tier: customer.tier,
                loyaltyPoints: customer.loyaltyPoints,
                isActive: customer.isActive,
                notes: customer.notes ?? "",
              }}
            />
          ) : (
            <Card title="Internal notes" description="Only staff see this. Never shown to the customer.">
              {anon ? (
                <Notice tone="info" className="mb-4">
                  This record was anonymised. Personal details were removed and it can no longer be edited.
                </Notice>
              ) : (
                <Notice tone="info" className="mb-4">
                  You can view this customer. Editing details, tier and points needs the Manager role.
                </Notice>
              )}
              <p className={cn("whitespace-pre-wrap text-[13.5px] leading-relaxed", customer.notes ? "text-ink-800" : "text-ink-400")}>
                {customer.notes || "No notes yet."}
              </p>
            </Card>
          )}

          <Card
            title="Orders"
            description={
              customer._count.orders > RECENT
                ? `Latest ${RECENT} of ${customer._count.orders}`
                : `${customer._count.orders} in total`
            }
            padded={false}
          >
            {customer.orders.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ink-500">No orders placed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <Th>Order</Th>
                      <Th>Placed</Th>
                      <Th>Status</Th>
                      <Th>Payment</Th>
                      <Th align="right">Items</Th>
                      <Th align="right">Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((o) => (
                      <Tr key={o.id}>
                        <Td>
                          <Link href={`/admin/orders/${o.id}`} className="font-medium text-ink-950 hover:text-brand-700">
                            {o.number}
                          </Link>
                          {o.couponCode && <span className="block text-[11.5px] text-ink-400">Coupon {o.couponCode}</span>}
                        </Td>
                        <Td>
                          <DateCell value={o.placedAt} />
                        </Td>
                        <Td>
                          <StatusPill status={o.status} />
                        </Td>
                        <Td>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusPill status={o.paymentStatus} />
                            <span className="text-[11.5px] text-ink-500">{PAYMENT_LABEL[o.paymentMethod]}</span>
                          </div>
                        </Td>
                        <Td align="right">{o._count.lines}</Td>
                        <Td align="right">
                          <Money value={o.total} className={cn("font-medium", o.status === "CANCELLED" && "text-ink-400 line-through")} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Returns"
            description={
              customer._count.returns > RECENT ? `Latest ${RECENT} of ${customer._count.returns}` : `${customer._count.returns} in total`
            }
            padded={false}
          >
            {customer.returns.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ink-500">No return requests.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {customer.returns.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/returns/${r.id}`} className="block truncate font-medium text-ink-950 hover:text-brand-700">
                        {r.orderLine.title}
                        {r.orderLine.variantLabel && <span className="font-normal text-ink-500"> · {r.orderLine.variantLabel}</span>}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-ink-500">
                        <Link href={`/admin/orders/${r.order.id}`} className="hover:text-brand-700">
                          {r.order.number}
                        </Link>
                        <span className="mx-1.5 text-ink-300">·</span>
                        {r.reason}
                        <span className="mx-1.5 text-ink-300">·</span>
                        <DateCell value={r.requestedAt} />
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                    <Money value={r.refundAmount} className="w-24 text-right font-medium text-ink-900" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Reviews"
            description={
              customer._count.reviews > RECENT ? `Latest ${RECENT} of ${customer._count.reviews}` : `${customer._count.reviews} in total`
            }
            padded={false}
          >
            {customer.reviews.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-ink-500">No reviews written.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {customer.reviews.map((r) => (
                  <li key={r.id} className="px-5 py-3.5 text-[13px]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <Stars rating={r.rating} />
                      <p className="min-w-0 flex-1 truncate font-medium text-ink-950">{r.title}</p>
                      <StatusPill status={r.status} />
                      <DateCell value={r.createdAt} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">{r.body}</p>
                    <p className="mt-1 text-[12px] text-ink-500">
                      On{" "}
                      <Link href={`/admin/products/${r.product.id}`} className="font-medium text-ink-700 hover:text-brand-700">
                        {r.product.title}
                      </Link>
                      {r.verified && <span className="ml-2 text-brand-700">Verified purchase</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card title="Profile">
            <KeyValue
              rows={[
                {
                  label: "Email",
                  value: (
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0 break-all">{customer.email}</span>
                      {!anon && <CopyButton value={customer.email} />}
                    </span>
                  ),
                },
                {
                  label: "Phone",
                  value: customer.phone ? (
                    <span className="flex items-center justify-between gap-2 tabular-nums">
                      {customer.phone}
                      <CopyButton value={customer.phone} />
                    </span>
                  ) : (
                    <span className="text-ink-400">Not provided</span>
                  ),
                },
                { label: "Tier", value: tierLabel(customer.tier) },
                { label: "Points", value: <span className="tabular-nums">{customer.loyaltyPoints.toLocaleString("en-IN")}</span> },
                {
                  label: "Account",
                  value: anon ? (
                    <span className="text-ink-500">Closed (anonymised)</span>
                  ) : guest ? (
                    <span className="text-ink-600">Guest checkout only</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-ink-900">
                      <KeyRound size={13} className="text-brand-600" /> Registered
                    </span>
                  ),
                },
                { label: "Joined", value: <DateCell value={customer.createdAt} time /> },
                {
                  label: "Last login",
                  value: customer.lastLoginAt ? <DateCell value={customer.lastLoginAt} time /> : <span className="text-ink-400">Never</span>,
                },
                { label: "Updated", value: <DateCell value={customer.updatedAt} time /> },
                {
                  label: "Customer ID",
                  value: (
                    <span className="flex items-center justify-between gap-2">
                      <code className="text-[12px] text-ink-600">{customer.id}</code>
                      <CopyButton value={customer.id} />
                    </span>
                  ),
                },
              ]}
            />
          </Card>

          <Card title="Addresses" description={`${customer.addresses.length} saved`}>
            {customer.addresses.length === 0 ? (
              <p className="text-[13px] text-ink-500">{anon ? "Removed on anonymisation." : "No saved addresses."}</p>
            ) : (
              <ul className="space-y-3">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="rounded-lg border border-hairline bg-canvas p-3 text-[12.5px] leading-relaxed text-ink-700">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <Pill tone="neutral">{ADDRESS_LABEL[a.label]}</Pill>
                      {a.isDefault && <Pill tone="brand">Default</Pill>}
                    </div>
                    <p className="font-medium text-ink-900">{a.fullName}</p>
                    <p>
                      {a.line1}
                      {a.line2 && <>, {a.line2}</>}
                    </p>
                    {a.landmark && <p className="text-ink-500">Near {a.landmark}</p>}
                    <p>
                      {a.city}, {a.state} {a.pincode}
                    </p>
                    <p className="tabular-nums text-ink-500">{a.phone}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Danger zone" className="border-sale-200">
            {anon ? (
              <p className="text-[13px] leading-relaxed text-ink-600">
                This record was anonymised and is frozen: it cannot be edited, reactivated or anonymised again. Its
                orders remain visible above for accounting.
              </p>
            ) : (
              <div className="space-y-4">
                {hasRole(session, "MANAGER") ? (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink-900">
                        {customer.isActive ? "Deactivate account" : "Reactivate account"}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                        {customer.isActive
                          ? "Signs them out everywhere and blocks sign-in. Orders and history are kept."
                          : "Lets them sign in and order from their account again."}
                      </p>
                    </div>
                    <ConfirmForm
                      action={setCustomerActive}
                      message={
                        customer.isActive
                          ? `Deactivate ${customer.name}? They will be signed out and unable to sign in until reactivated.`
                          : `Reactivate ${customer.name}? They will be able to sign in again.`
                      }
                    >
                      <input type="hidden" name="id" value={customer.id} />
                      <input type="hidden" name="active" value={customer.isActive ? "false" : "true"} />
                      <input type="hidden" name="returnTo" value={detailHref} />
                      <button type="submit" className={buttonClasses("outline", "xs")}>
                        <Power size={13} /> {customer.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </ConfirmForm>
                  </div>
                ) : (
                  <p className="text-[12.5px] text-ink-500">Deactivating an account needs the Manager role.</p>
                )}

                {hasRole(session, "OWNER") && (
                  <div className="flex flex-wrap items-start justify-between gap-3 border-t border-hairline pt-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink-900">Anonymise customer</p>
                      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-500">
                        For erasure requests. Replaces name, email and phone with redacted values, deletes saved addresses and
                        closes the account. Orders are kept for accounting. Cannot be undone.
                      </p>
                    </div>
                    <ConfirmForm
                      action={anonymiseCustomer}
                      message={`Anonymise ${customer.name}?\n\nTheir name, email, phone and saved addresses will be permanently removed and the account closed. Orders are kept for accounting.\n\nThis cannot be undone.`}
                    >
                      <input type="hidden" name="id" value={customer.id} />
                      <button type="submit" className={buttonClasses("danger", "xs")}>
                        <ShieldOff size={13} /> Anonymise
                      </button>
                    </ConfirmForm>
                  </div>
                )}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`} title={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= rating ? "fill-gold-500 text-gold-500" : "text-ink-200"}
          strokeWidth={n <= rating ? 0 : 1.5}
        />
      ))}
    </span>
  );
}
