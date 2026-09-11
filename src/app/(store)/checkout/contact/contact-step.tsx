"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Info, Pencil, UserRound } from "lucide-react";
import type { Offer } from "@/lib/types";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useStore } from "@/store/store";
import { computeTotals, evaluateCoupon } from "@/lib/pricing";
import { Form } from "@/components/ui/form";


interface Contact {
  name: string;
  email: string;
  phone: string;
}

export function ContactStep({ offers }: { offers: Offer[] }) {
  const { cart, coupon, checkout, customer, config, dispatch } = useStore();
  const router = useRouter();

  // Untouched, the form shows the signed-in customer's details — which arrive
  // after mount, so the draft stays null until they actually type something.
  const [draft, setDraft] = useState<Contact | null>(checkout.contact);
  const form: Contact = draft ?? {
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
  };
  const setForm = (patch: Partial<Contact>) => setDraft({ ...form, ...patch });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Details already on the account are shown for confirmation rather than
  // asked for again; the fields are one press away if anything has changed.
  const [editing, setEditing] = useState(false);
  const confirming = Boolean(customer?.name && customer.email && customer.phone) && !editing;

  const itemsTotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const applied = offers.find((o) => o.code === coupon) ?? null;
  const check = applied
    ? evaluateCoupon(applied, itemsTotal, [...new Set(cart.map((l) => l.categorySlug))])
    : { ok: false, discount: 0 };

  const totals = computeTotals(cart, {
    delivery: config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0],
    rates: config.rates,
    coupon: applied && check.ok ? { code: applied.code, discount: check.discount, type: applied.type } : null,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Please enter your full name.";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email))
      next.email = "Enter a valid email — we send the invoice here.";
    if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(form.phone.replace(/\s/g, "")))
      next.phone = "Enter a 10-digit Indian mobile number.";

    setErrors(next);
    if (Object.keys(next).length) {
      setEditing(true);
      return;
    }

    dispatch({ type: "checkout/patch", patch: { contact: form } });
    router.push("/checkout/address");
  }

  return (
    <CheckoutShell
      step="contact"
      title="Who is this order for?"
      description="We use these details for the invoice, delivery updates and nothing else."
      aside={
        <>
          <CheckoutAside offers={offers} />
          <OrderSummary totals={totals} lines={cart} delivery={null} showDeliveryEstimate={false} />
        </>
      }
      total={totals.total}
      action={
        // Sits outside the form in the pinned bar, so it names the form it submits.
        <Button
          type="submit"
          form="checkout-contact"
          size="lg"
          className="w-full px-4 sm:w-auto sm:min-w-[240px] sm:px-8"
        >
          Continue to address
          <ArrowRight size={17} />
        </Button>
      }
    >
      <Form id="checkout-contact" onSubmit={submit} className="space-y-4 sm:space-y-5">
        <div className="rounded-xl border border-hairline bg-surface p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
            <h2 className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:text-[13px]">
              <UserRound size={15} className="text-brand-600" />
              Contact details
            </h2>
            {confirming && (
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="h-10 sm:h-8"
                onClick={() => setEditing(true)}
              >
                <Pencil size={12} /> Edit
              </Button>
            )}
          </div>

          {confirming ? (
            <dl className="space-y-2 sm:space-y-2.5">
              {[
                { label: "Name", value: form.name },
                { label: "Email", value: form.email },
                { label: "Mobile", value: form.phone },
              ].map((row) => (
                <div key={row.label} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <dt className="w-16 shrink-0 text-[12px] text-ink-500 sm:text-[12.5px]">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 text-[13.5px] font-medium text-ink-950 wrap-anywhere sm:text-[14px]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Field label="Full name" htmlFor="name" error={errors.name} className="sm:col-span-2">
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  invalid={Boolean(errors.name)}
                  onChange={(e) => setForm({ name: e.target.value })}
                  placeholder="Ananya Iyer"
                />
              </Field>

              <Field
                label="Email address"
                htmlFor="email"
                error={errors.email}
                hint="Your GST invoice and order updates go here."
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  invalid={Boolean(errors.email)}
                  onChange={(e) => setForm({ email: e.target.value })}
                  placeholder="you@example.in"
                />
              </Field>

              <Field
                label="Mobile number"
                htmlFor="phone"
                error={errors.phone}
                hint="The courier calls this number before delivery."
              >
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  invalid={Boolean(errors.phone)}
                  onChange={(e) => setForm({ phone: e.target.value })}
                  placeholder="+91 98450 12345"
                />
              </Field>
            </div>
          )}

          <p className="mt-3 flex items-start gap-2 rounded-lg bg-ink-50 p-3 text-[12.5px] leading-relaxed text-ink-600 sm:mt-4 sm:text-[12px]">
            <Info size={13} className="mt-px shrink-0 text-brand-600" />
            {customer ? (
              <span className="min-w-0">
                Signed in as{" "}
                <strong className="font-semibold text-ink-900 wrap-anywhere">{customer.email}</strong>
                . Your saved addresses are ready at the next step, and this order will appear in your
                account.
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <Link
                  href="/login?next=/checkout/contact"
                  className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  Sign in
                </Link>{" "}
                to use your saved addresses. An account is needed to place the order — you can
                create one at the last step, and everything you enter along the way is kept.
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* A 40px touch target on phones; the negative margin keeps the row. */}
          <Link
            href="/cart"
            className="-my-2.5 py-2.5 text-[13px] font-medium text-ink-600 underline-offset-4 hover:text-ink-900 hover:underline lg:my-0 lg:py-0"
          >
            Back to bag
          </Link>
          <Button type="submit" size="lg" className="hidden min-w-[200px] lg:inline-flex">
            Continue to address
            <ArrowRight size={17} />
          </Button>
        </div>
      </Form>
    </CheckoutShell>
  );
}
