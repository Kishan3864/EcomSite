"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { requestOwnPasswordLink } from "@/services/commerce";

/**
 * Adds a password to an account that signs in with Google.
 *
 * It deliberately does not take a password here and set it straight away. The
 * person is already signed in, so we could — but then anybody who walked up to
 * an unlocked laptop could add a password and own the account quietly. Sending
 * the link to the address on file means the change still has to pass through
 * the mailbox, and the confirmation email gives the real owner a chance to
 * notice. One extra click, and the account cannot be taken over from a borrowed
 * screen.
 */
function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" loading={pending}>
      <KeyRound size={15} /> {pending ? "Sending…" : "Email me a link"}
    </Button>
  );
}

export function PasswordCard({ email }: { email: string }) {
  const [state, action] = useActionState(requestOwnPasswordLink, {});

  if (state.ok) {
    return (
      <div className="flex items-start gap-3 bg-canvas px-4 py-3.5">
        <MailCheck size={18} className="mt-0.5 shrink-0 text-brand-700" />
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-ink-900">Check your inbox</p>
          <p className="mt-1 text-[13px] leading-[1.55] text-ink-600">
            We have sent a link to <span className="break-words font-medium">{email}</span>. It
            works once and expires in an hour. Your Google sign-in keeps working either way.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Form action={action}>
      <p className="text-[13px] leading-[1.6] text-ink-600">
        You sign in with Google. Add a password and you can use either — we will never take the
        Google option away. For safety the link goes to{" "}
        <span className="break-words font-medium text-ink-800">{email}</span> rather than setting it
        here and now.
      </p>
      {state.error ? (
        <p className="mt-3 bg-gold-50 px-3.5 py-2.5 text-[13px] leading-[1.5] text-ink-800">
          {state.error}
        </p>
      ) : null}
      <div className="mt-4">
        <SendButton />
      </div>
    </Form>
  );
}
