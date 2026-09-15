"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CheckoutAside, CheckoutShell } from "@/components/checkout/shell";
import { OrderSummary } from "@/components/cart/order-summary";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useStore } from "@/store/store";
import { computeTotals } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";


interface Contact {
  name: string;
  email: string;
  phone: string;
}

export function ContactStep() {
  const { cart, checkout, customer, config, dispatch } = useStore();
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

  const totals = computeTotals(cart, {
    delivery: config.deliveryOptions.find((d) => d.id === checkout.deliveryId) ?? config.deliveryOptions[0],
    rates: config.rates,
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
          <CheckoutAside />
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
      <Form id="checkout-contact" onSubmit={submit} className="space-y-6">
        <section className="bg-surface shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 pb-3">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
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
                Edit
              </Button>
            )}
          </div>

          {confirming ? (
            /* Read back as a ledger: the label in the left column, the value
               right of it, one ruled row apiece. An email longer than the row
               wraps rather than pushing the column about. */
            <dl className="pt-1">
              {(
                [
                  { label: "Name", value: form.name },
                  { label: "Email", value: form.email },
                  // Every digit the same width, so the number reads as a number.
                  { label: "Mobile", value: form.phone, numeric: true },
                ] as { label: string; value: string; numeric?: boolean }[]
              ).map((row, i) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex min-h-11 flex-wrap items-center gap-x-4 gap-y-0.5 py-2",
                    i > 0 && "rule-hair-t",
                  )}
                >
                  <dt className="w-[72px] shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    {row.label}
                  </dt>
                  <dd
                    className={cn(
                      "min-w-0 flex-1 text-[13.5px] font-medium text-ink-950 wrap-anywhere",
                      row.numeric && "tabular-nums",
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="grid gap-4 pt-4 sm:grid-cols-2">
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
                  className="tabular-nums"
                />
              </Field>
            </div>
          )}

          {/* A rule and a paragraph, rather than a tinted box: the note is read
              in the same ink as everything else on the page. */}
          <p className="mt-4 pt-3.5 text-[13px] leading-[1.55] text-ink-600">
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
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* A 40px touch target on phones; the negative margin keeps the row. */}
          <Link
            href="/cart"
            className="-my-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500 transition-colors duration-200 hover:text-ink-950 lg:my-0 lg:py-0"
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
