"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Lock, Send } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Reveal } from "@/components/ui/motion";
import { submitContact } from "@/services/commerce";
import { Form } from "@/components/ui/form";
import { BUSINESS } from "@/config/business";

const TOPICS = [
  "Where is my order?",
  "Return or exchange",
  "Refund not received",
  "Product question",
  "Damaged or wrong item",
  "Bulk or corporate order",
  "I make things and want to sell here",
  "Something else",
];

/** Mirrors the server's ceilings so the field stops before a refusal does. */
const MAX_MESSAGE = 4_000;

export interface ContactFormProps {
  /**
   * The signed-in customer, or null for a visitor. Never inferred from a
   * half-remembered cookie or a previous order — if the server did not hand us
   * a session, both fields start empty.
   */
  account: { name: string; email: string } | null;
  /** Signed at render, proving to the server how long the form has been open. */
  formToken: string;
}

export function ContactForm({ account, formToken }: ContactFormProps) {
  const [form, setForm] = useState({
    name: account?.name ?? "",
    email: account?.email ?? "",
    topic: TOPICS[0],
    orderNumber: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  /**
   * The honeypot's value. A real person never sees this field, so anything in
   * it came from something filling inputs by name. Kept in a ref rather than
   * state: it must not cause a render, and nothing in the UI depends on it.
   */
  const honeypot = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Tell us your name.";
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(form.email))
      next.email = "We need a valid email to reply to.";
    if (form.message.trim().length < 10)
      next.message = "A sentence or two helps us answer properly.";

    setErrors(next);
    if (Object.keys(next).length) return;

    // Lands in the admin inbox, where support answers it. Every check here is
    // repeated on the server, which is the one that counts.
    startTransition(async () => {
      const result = await submitContact({
        name: form.name,
        email: form.email,
        topic: form.topic,
        orderNumber: form.orderNumber || undefined,
        message: form.message,
        website: honeypot.current?.value ?? "",
        formToken,
      });
      if (!result.ok) {
        setErrors({ [result.field ?? "message"]: result.error });
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <Reveal className="min-w-0 bg-surface shadow-sm p-5 sm:p-8">
        <span className="eyebrow">Received</span>
        <h2 className="mt-3 font-display text-[22px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[28px]">
          Message received
        </h2>
        {/* Everything interpolated here is React-escaped, so a message
            containing markup renders as the text it is. break-words: the
            echoed email is one unbreakable word. */}
        <p className="mt-3 max-w-[60ch] break-words text-[14px] leading-[1.65] text-ink-600 sm:text-[15px]">
          Thanks {form.name.split(" ")[0]} — we have your message about{" "}
          <strong className="font-semibold text-ink-900">{form.topic.toLowerCase()}</strong> and
          will reply to <strong className="font-semibold text-ink-900">{form.email}</strong>.
        </p>
        <p className="mt-3 max-w-[60ch] break-words text-[14px] leading-[1.65] text-ink-600 sm:text-[15px]">
          A confirmation with a copy of what you wrote is on its way from{" "}
          <strong className="font-semibold text-ink-900">{BUSINESS.supportEmail}</strong>. If it is
          not in your inbox in a few minutes, look in spam and mark it as safe — that is also the
          address our reply will come from.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          <Link href="/products" className={buttonClasses("primary", "md")}>
            Keep shopping
          </Link>
        </div>
      </Reveal>
    );
  }

  return (
    <Form onSubmit={submit} className="min-w-0 bg-surface shadow-sm p-4 sm:p-8">
      <h2 className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[28px]">
        Send us a message
      </h2>
      <p className="mt-2 max-w-[60ch] text-[13px] leading-[1.6] text-ink-600 sm:text-[14px]">
        The more specific you are, the faster we can fix it. Include an order number if you have
        one.
      </p>

      {/*
        The honeypot.
        Taken out of the layout and out of the accessibility tree, but not with
        `display:none` — the cruder bots skip anything displayed as none, and
        this catches more of them by looking like an ordinary field to a script
        reading the DOM. aria-hidden and tabIndex keep it away from screen
        readers and the tab order, and autoComplete="off" stops a browser
        helpfully filling it for a real person.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input
          ref={honeypot}
          id="c-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="mt-5 grid gap-4 sm:mt-7 sm:grid-cols-2 sm:gap-5">
        <Field label="Your name" htmlFor="c-name" error={errors.name}>
          <Input
            id="c-name"
            autoComplete="name"
            maxLength={80}
            value={form.name}
            invalid={Boolean(errors.name)}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ananya Iyer"
          />
        </Field>

        <Field label="Email address" htmlFor="c-email" error={errors.email}>
          {account ? (
            /*
              Signed in: the address is the account's, shown but not editable.
              The server uses the session's address regardless of what arrives,
              so an editable field here would only be a box that silently does
              nothing.
            */
            <div className="flex items-center gap-2 border border-ink-200 bg-ink-50 px-3.5 py-3">
              <Lock size={14} className="shrink-0 text-ink-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[16px] text-ink-700 sm:text-[14px]">
                {account.email}
              </span>
              <span className="shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-brand-700">
                Verified
              </span>
            </div>
          ) : (
            <Input
              id="c-email"
              type="email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              invalid={Boolean(errors.email)}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.in"
            />
          )}
        </Field>

        <Field label="What is this about?" htmlFor="c-topic">
          <Select
            id="c-topic"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Order number" htmlFor="c-order" optional>
          <Input
            id="c-order"
            value={form.orderNumber}
            maxLength={40}
            onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
            placeholder="WKC-2026-005001"
            className="tabular-nums"
          />
        </Field>

        <Field label="Message" htmlFor="c-message" error={errors.message} className="sm:col-span-2">
          <textarea
            id="c-message"
            rows={5}
            maxLength={MAX_MESSAGE}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Tell us what happened…"
            // 16px on phones, as in the shared inputs: iOS zooms into smaller fields.
            className="w-full border bg-canvas px-3.5 py-3 text-[16px] leading-[1.6] text-ink-900 outline-none transition-colors placeholder:text-ink-400 sm:text-[14px]"
          />
        </Field>
      </div>

      {/* Phones: the note, then a full-width send button. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <p className="max-w-[46ch] text-[13px] leading-[1.6] text-ink-500">
          We reply from{" "}
          <span className="font-medium text-ink-700">{BUSINESS.supportEmail}</span> — add it to your
          contacts so our answer does not land in spam. We use what you send only to answer you; see
          our{" "}
          <Link href="/legal/privacy" className="font-medium text-brand-700 hover:underline">
            privacy policy
          </Link>
          .
        </p>
        <Button type="submit" size="lg" loading={pending}>
          <Send size={16} /> Send message
        </Button>
      </div>
    </Form>
  );
}
