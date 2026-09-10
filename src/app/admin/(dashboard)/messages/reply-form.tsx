"use client";

import { useActionState } from "react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, Label, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { Form } from "@/components/ui/form";

/**
 * Reply editor for a contact message. Saving stores the reply on the message
 * and marks it as replied; no email leaves the system in this phase.
 */
export function ReplyForm({
  action,
  initial = "",
  hasReply,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: string;
  hasReply: boolean;
}) {
  const [state, formAction] = useActionState(action, INITIAL_FORM);

  return (
    <Form action={formAction} className="grid gap-3">
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
      {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

      <div>
        <Label htmlFor="message-reply">{hasReply ? "Edit your reply" : "Your reply"}</Label>
        <textarea
          id="message-reply"
          name="reply"
          rows={6}
          defaultValue={initial}
          className={textareaCls}
          placeholder="Thanks for writing in…"
          maxLength={5000}
        />
        <FieldError>{state.field === "reply" ? state.error : undefined}</FieldError>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] leading-snug text-ink-500">
          Saving records the reply here and marks the message as replied. No email is sent in this phase — use{" "}
          <span className="font-medium text-ink-700">Reply by email</span> above to send it from your mail client.
        </p>
        <SubmitButton size="sm" pendingText="Saving…">
          {hasReply ? "Update reply" : "Save reply"}
        </SubmitButton>
      </div>
    </Form>
  );
}
