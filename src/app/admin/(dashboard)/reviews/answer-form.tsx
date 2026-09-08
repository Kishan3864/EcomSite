"use client";

import { useActionState, useId, useState } from "react";
import { MessageSquareReply, Pencil, X } from "lucide-react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, Label, inputCls, textareaCls } from "@/components/admin/ui";
import type { FormState } from "@/services/admin/form-state";
import { INITIAL_FORM } from "@/services/admin/form-state";

/**
 * Inline per-row answer editor for the Q&A tab. Closed, it shows the current
 * answer (or "Unanswered"); open, a textarea + "answered by" field that posts
 * to `answerQuestion` bound to the question id. Success redirects with a flash
 * and the page keys this component on answeredAt, so it remounts closed.
 */
export function AnswerForm({
  action,
  initial,
  answeredBy,
  answeredAtLabel,
  askedBy,
  returnTo,
  canEdit,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: string;
  answeredBy: string;
  answeredAtLabel?: string;
  askedBy: string;
  returnTo: string;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, INITIAL_FORM);
  const uid = useId();
  const hasAnswer = initial.trim().length > 0;

  if (!open) {
    return (
      <div className="min-w-[240px] max-w-[420px]">
        {hasAnswer ? (
          <>
            <p className="text-[12.5px] leading-relaxed text-ink-700">{initial}</p>
            <p className="mt-1 text-[11.5px] text-ink-400">
              {answeredBy}
              {answeredAtLabel ? ` · ${answeredAtLabel}` : ""}
            </p>
          </>
        ) : (
          <p className="text-[12.5px] italic text-ink-400">Unanswered</p>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
          >
            {hasAnswer ? <Pencil size={12} /> : <MessageSquareReply size={13} />}
            {hasAnswer ? "Edit answer" : "Answer"}
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="grid w-[min(520px,70vw)] gap-3 rounded-lg border border-hairline bg-canvas p-3">
      <input type="hidden" name="returnTo" value={returnTo} />
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}

      <div>
        <Label htmlFor={`${uid}-answer`}>Reply to {askedBy}</Label>
        <textarea
          id={`${uid}-answer`}
          name="answer"
          rows={4}
          defaultValue={initial}
          className={textareaCls}
          placeholder="Write a clear, friendly answer shoppers will see on the product page…"
          maxLength={2000}
          autoFocus
        />
        <FieldError>{state.field === "answer" ? state.error : undefined}</FieldError>
      </div>

      <div>
        <Label htmlFor={`${uid}-by`} hint="Shown under the answer on the storefront.">
          Answered by
        </Label>
        <input id={`${uid}-by`} name="answeredBy" defaultValue={answeredBy} className={inputCls} maxLength={60} />
        <FieldError>{state.field === "answeredBy" ? state.error : undefined}</FieldError>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <X size={13} /> Cancel
        </button>
        <SubmitButton size="xs" pendingText="Posting…">
          {hasAnswer ? "Update answer" : "Post answer"}
        </SubmitButton>
      </div>
    </form>
  );
}
