"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Reveal } from "@/components/ui/motion";
import { submitContact } from "@/services/commerce";
import { Form } from "@/components/ui/form";

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

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: TOPICS[0],
    orderNumber: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

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

    // Lands in the admin inbox, where support answers it.
    startTransition(async () => {
      const result = await submitContact({
        name: form.name,
        email: form.email,
        topic: form.topic,
        orderNumber: form.orderNumber || undefined,
        message: form.message,
      });
      if (!result.ok) {
        setErrors({ message: result.error });
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <Reveal className="min-w-0 border border-hairline bg-surface p-5 sm:p-8">
        <span className="eyebrow">Received</span>
        <h2 className="mt-3 font-display text-[22px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[28px]">
          Message received
        </h2>
        {/* break-words: the echoed email is one unbreakable word. */}
        <p className="mt-3 max-w-[60ch] break-words text-[14px] leading-[1.65] text-ink-600 sm:text-[15px]">
          Thanks {form.name.split(" ")[0]} — we have your message about{" "}
          <strong className="font-semibold text-ink-900">{form.topic.toLowerCase()}</strong> and
          will reply to <strong className="font-semibold text-ink-900">{form.email}</strong>. Expect
          an answer within a few minutes during working hours.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          <Link href="/products" className={buttonClasses("primary", "md")}>
            Keep shopping
          </Link>
          <button
            onClick={() => {
              setSent(false);
              setForm((f) => ({ ...f, message: "", orderNumber: "" }));
            }}
            className={buttonClasses("outline", "md")}
          >
            Send another message
          </button>
        </div>
      </Reveal>
    );
  }

  return (
    <Form onSubmit={submit} className="min-w-0 border border-hairline bg-surface p-4 sm:p-8">
      <h2 className="font-display text-[22px] leading-tight tracking-[-0.02em] text-ink-950 sm:text-[28px]">
        Send us a message
      </h2>
      <p className="mt-2 max-w-[60ch] text-[13px] leading-[1.6] text-ink-600 sm:text-[14px]">
        The more specific you are, the faster we can fix it. Include an order number if you have
        one.
      </p>

      <div className="mt-5 grid gap-4 sm:mt-7 sm:grid-cols-2 sm:gap-5">
        <Field label="Your name" htmlFor="c-name" error={errors.name}>
          <Input
            id="c-name"
            autoComplete="name"
            value={form.name}
            invalid={Boolean(errors.name)}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ananya Iyer"
          />
        </Field>

        <Field label="Email address" htmlFor="c-email" error={errors.email}>
          <Input
            id="c-email"
            type="email"
            autoComplete="email"
            value={form.email}
            invalid={Boolean(errors.email)}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.in"
          />
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
            onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))}
            placeholder="WKC-2026-005001"
            className="tabular-nums"
          />
        </Field>

        <Field label="Message" htmlFor="c-message" error={errors.message} className="sm:col-span-2">
          <textarea
            id="c-message"
            rows={5}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Tell us what happened…"
            // 16px on phones, as in the shared inputs: iOS zooms into smaller fields.
            className={`w-full rounded-field border bg-canvas px-3.5 py-3 text-[16px] leading-[1.6] text-ink-900 outline-none transition-colors placeholder:text-ink-400 sm:text-[14px] ${
              errors.message
                ? "border-sale-500 focus:border-sale-600"
                : "border-ink-200 hover:border-ink-300 focus:border-brand-500"
            }`}
          />
        </Field>
      </div>

      {/* Phones: the note, then a full-width send button. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <p className="max-w-[46ch] text-[13px] leading-[1.6] text-ink-500">
          We use what you send only to answer you. See our{" "}
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
