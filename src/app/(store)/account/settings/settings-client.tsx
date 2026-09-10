"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Check,
  CreditCard,
  Landmark,
  LifeBuoy,
  MapPin,
  Package,
  Smartphone,
  Wallet,
} from "lucide-react";
import type { Address, PaymentMethodId } from "@/lib/types";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, OptionCard } from "@/components/ui/field";
import {
  savePaymentPreferences,
  setDefaultAddress,
  updateCustomerProfile,
  type AccountFormState,
} from "@/services/account-actions";
import { useStore } from "@/store/store";
import { Form } from "@/components/ui/form";

const ICONS: Record<PaymentMethodId, typeof Wallet> = {
  upi: Smartphone,
  card: CreditCard,
  netbanking: Landmark,
  wallet: Wallet,
  cod: Banknote,
};

export interface SettingsProfile {
  name: string;
  email: string;
  phone: string;
}

export function SettingsClient({
  profile,
  addresses,
}: {
  profile: SettingsProfile;
  addresses: Address[];
}) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-[28px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          Settings
        </h1>
        <p className="mt-2 text-[14px] text-ink-600">
          Your details, where we deliver by default, and how you prefer to pay.
        </p>
      </header>

      <DetailsSection profile={profile} />
      <DefaultAddressSection addresses={addresses} />
      <PaymentSection />
      <MoreSection />
    </div>
  );
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-32 overflow-hidden rounded-xl border border-hairline bg-surface"
    >
      <header className="border-b border-hairline px-5 py-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
          {title}
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{description}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Feedback({ state }: { state: AccountFormState }) {
  if (state.error && !state.field)
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-sale-100 bg-sale-50 px-3.5 py-2.5 text-[13px] text-sale-700"
      >
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        {state.error}
      </p>
    );

  if (state.ok && state.message)
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-[13px] text-brand-800"
      >
        <Check size={14} className="mt-0.5 shrink-0" />
        {state.message}
      </p>
    );

  return null;
}

function SaveButton({ children, disabled }: { children: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={disabled}>
      {pending ? "Saving" : children}
    </Button>
  );
}

function DetailsSection({ profile }: { profile: SettingsProfile }) {
  const [state, action] = useActionState(updateCustomerProfile, {});

  return (
    <Section
      title="Your details"
      description="The name and number we put on deliveries, and use when we need to reach you about an order."
    >
      <Form action={action} className="space-y-4">
        <Feedback state={state} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            htmlFor="settings-name"
            error={state.field === "name" ? state.error : undefined}
          >
            <Input
              id="settings-name"
              name="name"
              autoComplete="name"
              required
              defaultValue={state.values?.name ?? profile.name}
              invalid={state.field === "name"}
            />
          </Field>

          <Field
            label="Mobile number"
            htmlFor="settings-phone"
            error={state.field === "phone" ? state.error : undefined}
          >
            <Input
              id="settings-phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              defaultValue={state.values?.phone ?? profile.phone}
              invalid={state.field === "phone"}
              placeholder="9876543210"
            />
          </Field>

          <Field
            label="Email address"
            htmlFor="settings-email"
            className="sm:col-span-2"
            hint="To change this, write to support and we will move your orders across."
          >
            <Input
              id="settings-email"
              value={profile.email}
              readOnly
              className="bg-ink-50 text-ink-500"
            />
          </Field>
        </div>

        <SaveButton>Save details</SaveButton>
      </Form>
    </Section>
  );
}

function DefaultAddressSection({ addresses }: { addresses: Address[] }) {
  const [selected, setSelected] = useState(addresses.find((a) => a.isDefault)?.id ?? "");

  if (addresses.length === 0)
    return (
      <Section
        title="Default delivery address"
        description="Save one address as the default and checkout will start there every time."
      >
        <p className="text-[13.5px] text-ink-600">You have not saved an address yet.</p>
        <Link href="/account/addresses" className={buttonClasses("outline", "sm", "mt-3")}>
          <MapPin size={14} /> Add an address
        </Link>
      </Section>
    );

  return (
    <Section
      title="Default delivery address"
      description="Checkout starts here. You can still pick a different address at the time."
    >
      <Form action={setDefaultAddress} className="space-y-4">
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id}>
              <OptionCard
                selected={selected === address.id}
                onSelect={() => setSelected(address.id)}
                title={
                  <span className="flex items-center gap-2">
                    {address.fullName}
                    <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-600">
                      {address.label}
                    </span>
                    {address.isDefault && <Badge tone="success">Default</Badge>}
                  </span>
                }
                subtitle={
                  <>
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                    <br />
                    {address.city}, {address.state} {address.pincode}
                  </>
                }
              />
            </li>
          ))}
        </ul>

        <input type="hidden" name="addressId" value={selected} />

        <div className="flex flex-wrap items-center gap-4">
          <SaveButton disabled={!selected}>Set as default</SaveButton>
          <Link
            href="/account/addresses"
            className="text-[13px] font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Add or edit addresses
          </Link>
        </div>
      </Form>
    </Section>
  );
}

function PaymentSection() {
  const { config, customer, sessionChecked } = useStore();
  const [state, action] = useActionState(savePaymentPreferences, {});
  const [method, setMethod] = useState("");
  const [upiId, setUpiId] = useState("");
  const filled = useRef(false);

  // The session lands from /api/me a moment after this renders. Fill the form
  // the first time it arrives and leave it alone afterwards, so a save is never
  // undone by a later refetch.
  useEffect(() => {
    if (!sessionChecked || filled.current) return;
    filled.current = true;
    setMethod(customer?.preferredPayment ?? "");
    setUpiId(customer?.upiId ?? "");
  }, [sessionChecked, customer]);

  return (
    <Section
      id="payment"
      title="Payment preferences"
      description="We remember how you like to pay and pre-select it at checkout. Card numbers are never stored."
    >
      <Form action={action} className="space-y-4">
        <Feedback state={state} />

        {sessionChecked ? (
          <ul className="space-y-3">
            {config.paymentMethods.map((option) => {
              const Icon = ICONS[option.id];
              return (
                <li key={option.id}>
                  <OptionCard
                    selected={method === option.id}
                    onSelect={() => setMethod(option.id)}
                    title={
                      <span className="flex items-center gap-2">
                        <Icon size={16} className="text-brand-600" />
                        {option.name}
                      </span>
                    }
                    badge={option.badge ? <Badge tone="gold">{option.badge}</Badge> : null}
                    subtitle={option.description}
                  />
                </li>
              );
            })}
            <li>
              <OptionCard
                selected={method === ""}
                onSelect={() => setMethod("")}
                title="Ask me every time"
                subtitle="Nothing is pre-selected and you choose during checkout."
              />
            </li>
          </ul>
        ) : (
          <div className="space-y-3">
            {config.paymentMethods.map((option) => (
              <Skeleton key={option.id} className="h-[78px] rounded-xl" />
            ))}
          </div>
        )}

        <input type="hidden" name="method" value={method} />

        {state.field === "method" && (
          <p role="alert" className="flex items-start gap-1.5 text-[12px] text-sale-600">
            <AlertCircle size={12} className="mt-px shrink-0" />
            {state.error}
          </p>
        )}

        <Field
          label="UPI ID"
          htmlFor="settings-upi"
          optional
          error={state.field === "upiId" ? state.error : undefined}
          hint="Saved so the UPI step at checkout is already filled in."
        >
          <Input
            id="settings-upi"
            name="upiId"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            invalid={state.field === "upiId"}
            placeholder="yourname@okhdfcbank"
            disabled={!sessionChecked}
          />
        </Field>

        <SaveButton disabled={!sessionChecked}>Save preferences</SaveButton>
      </Form>
    </Section>
  );
}

function MoreSection() {
  const links = [
    {
      href: "/track",
      label: "Track an order",
      description: "Follow a delivery with the order number.",
      icon: Package,
    },
    {
      href: "/contact",
      label: "Help and support",
      description: "Questions about an order, a return or a product.",
      icon: LifeBuoy,
    },
  ];

  return (
    <Section title="More" description="The rest of what you might be looking for.">
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex h-full items-start gap-3 rounded-lg border border-hairline p-4 transition-colors hover:border-ink-200 hover:bg-ink-50"
            >
              <link.icon size={17} className="mt-0.5 shrink-0 text-brand-600" />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-ink-950">{link.label}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-500">{link.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
