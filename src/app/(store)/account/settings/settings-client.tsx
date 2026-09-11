"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  Banknote,
  Camera,
  Check,
  CreditCard,
  Landmark,
  LifeBuoy,
  MapPin,
  Package,
  ShieldCheck,
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
import { Avatar } from "@/components/account/avatar";
import { removeAvatar, uploadAvatar, type AvatarState } from "@/services/avatar-actions";
import { PhoneLinkCard } from "@/components/auth/phone-otp";

const ICONS: Record<PaymentMethodId, typeof Wallet> = {
  online: ShieldCheck,
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
  signInPhone,
}: {
  profile: SettingsProfile;
  addresses: Address[];
  /** Undefined when SMS is not configured; null when no number is verified yet. */
  signInPhone?: string | null;
}) {
  return (
    <div className="space-y-3 sm:space-y-5">
      <header className="pb-1 sm:pb-0">
        <h1 className="font-display text-[22px] leading-[1.08] tracking-[-0.025em] text-ink-950 sm:text-[34px]">
          Settings
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-600 sm:mt-2 sm:text-[14px]">
          Your details, where we deliver by default, and how you prefer to pay.
        </p>
      </header>

      <PhotoSection />
      <DetailsSection profile={profile} />
      {signInPhone !== undefined && (
        <Section
          id="mobile"
          title="Mobile number for sign-in"
          description="Verify your number once, then sign in any time with a one-time code sent by SMS."
        >
          <PhoneLinkCard verifiedPhone={signInPhone} />
        </Section>
      )}
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
      <header className="border-b border-hairline px-4 py-3 sm:px-5 sm:py-4">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-900 sm:text-[12px]">
          {title}
        </h2>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500 sm:mt-1">{description}</p>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Feedback({ state }: { state: AccountFormState }) {
  if (state.error && !state.field)
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-sale-100 bg-sale-50 px-3 py-2 text-[12.5px] text-sale-700 sm:px-3.5 sm:py-2.5 sm:text-[13px]"
      >
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        {state.error}
      </p>
    );

  if (state.ok && state.message)
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-[12.5px] text-brand-800 sm:px-3.5 sm:py-2.5 sm:text-[13px]"
      >
        <Check size={14} className="mt-0.5 shrink-0" />
        {state.message}
      </p>
    );

  return null;
}

function SaveButton({ children, disabled }: { children: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  // Full width on a phone, where the primary action spans the screen.
  return (
    <Button type="submit" loading={pending} disabled={disabled} className="w-full sm:w-auto">
      {pending ? "Saving" : children}
    </Button>
  );
}

/**
 * Profile photo.
 *
 * The image is cropped square and re-encoded in the browser before it is sent.
 * That keeps the upload to a few tens of kilobytes, and re-encoding drops the
 * EXIF block — a phone photo can carry the GPS position it was taken at, which
 * has no business leaving the customer's device. The server checks the bytes
 * again regardless; nothing here is trusted by it.
 */
function PhotoSection() {
  const { customer, sessionChecked, dispatch } = useStore();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<AvatarState>({});
  const [pending, startTransition] = useTransition();

  // Release the previous preview's object URL whenever it is replaced.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function refreshSession() {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      dispatch({ type: "session/set", customer: data.customer, addresses: data.addresses });
    }
    router.refresh();
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared so choosing the same file again still fires a change.
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setState({ error: "Choose an image file." });
      return;
    }
    if (file.size > 15_000_000) {
      setState({ error: "That file is too large. Choose a photo under 15 MB." });
      return;
    }

    let blob: Blob;
    try {
      blob = await squareImage(file, 320);
    } catch {
      setState({ error: "That image could not be read. Try a JPG or PNG." });
      return;
    }

    setPreview(URL.createObjectURL(blob));
    const form = new FormData();
    form.append("photo", new File([blob], "avatar", { type: blob.type }));

    startTransition(async () => {
      const result = await uploadAvatar({}, form);
      setState(result);
      if (result.ok) await refreshSession();
      else setPreview(null);
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeAvatar();
      setState(result);
      setPreview(null);
      if (result.ok) await refreshSession();
    });
  }

  const shown = preview ?? customer?.avatarUrl ?? null;
  const hasUpload = Boolean(customer?.avatarUrl?.startsWith("/api/account/avatar/"));

  return (
    <Section
      id="photo"
      title="Profile photo"
      description="Shown in your account menu. Without one, we use your Google photo, or a drawn avatar."
    >
      {/* Phones keep the controls beside the photo rather than wrapping them
          underneath it. */}
      <div className="flex items-center gap-4 sm:flex-wrap sm:gap-5">
        <Avatar src={shown} seed={customer?.email ?? ""} size={72} />
        <div className="min-w-0 flex-1 space-y-2.5 sm:flex-initial">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={!sessionChecked || pending}
              loading={pending}
              className="h-10 sm:h-9"
            >
              <Camera size={14} />
              {hasUpload ? "Change photo" : "Upload photo"}
            </Button>
            {hasUpload && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRemove}
                disabled={pending}
                className="h-10 sm:h-9"
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-ink-500">
            JPG, PNG or WebP. We crop it square and strip location data from it.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={onPick}
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 flex items-start gap-1.5 text-[12.5px] text-sale-600">
          <AlertCircle size={13} className="mt-px shrink-0" />
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="mt-4 flex items-center gap-1.5 text-[12.5px] text-brand-700">
          <Check size={13} className="shrink-0" />
          {state.message}
        </p>
      )}
    </Section>
  );
}

/** Crop to a centred square, scale it down, and re-encode it. */
async function squareImage(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  // WebP where the browser can write it; older Safari silently hands back a
  // PNG instead, so check the type and fall back to JPEG.
  const webp = await encode("image/webp", 0.86);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg", 0.88);
  if (!jpeg) throw new Error("Could not encode image");
  return jpeg;
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
        <p className="text-[13px] text-ink-600 sm:text-[13.5px]">You have not saved an address yet.</p>
        <Link href="/account/addresses" className={buttonClasses("outline", "sm", "mt-3 h-10 sm:h-9")}>
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
        <ul className="space-y-2 sm:space-y-3">
          {addresses.map((address) => (
            <li key={address.id}>
              <OptionCard
                selected={selected === address.id}
                onSelect={() => setSelected(address.id)}
                title={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
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

        <div className="flex flex-wrap items-center justify-center gap-1 sm:justify-start sm:gap-4">
          <SaveButton disabled={!selected}>Set as default</SaveButton>
          <Link
            href="/account/addresses"
            className="py-2 text-[13px] font-semibold text-brand-700 underline-offset-4 hover:underline sm:py-0"
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
  const filled = useRef(false);

  // The session lands from /api/me a moment after this renders. Fill the form
  // the first time it arrives and leave it alone afterwards, so a save is never
  // undone by a later refetch.
  useEffect(() => {
    if (!sessionChecked || filled.current) return;
    filled.current = true;
    setMethod(customer?.preferredPayment ?? "");
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
          <ul className="space-y-2 sm:space-y-3">
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
          <div className="space-y-2 sm:space-y-3">
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
      <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="tap flex h-full items-start gap-3 rounded-lg border border-hairline p-3.5 transition-colors hover:border-ink-200 hover:bg-ink-50 sm:p-4"
            >
              <link.icon size={17} className="mt-0.5 shrink-0 text-brand-600" />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink-950 sm:text-[13.5px]">
                  {link.label}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-ink-500">{link.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
