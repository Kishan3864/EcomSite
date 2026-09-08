"use client";

import { useActionState } from "react";
import { KeyRound, Save } from "lucide-react";
import { Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, FormSection, Label, inputCls } from "@/components/admin/ui";
import { INITIAL_FORM } from "@/services/admin/form-state";
import { changeOwnPassword, updateOwnProfile } from "@/services/admin/team-actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateOwnProfile, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <form action={action} className="grid gap-4">
      <FormSection title="Your details" description="Shown on the activity log beside everything you change.">
        {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
        {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-name">Full name</Label>
            <input id="profile-name" name="name" defaultValue={name} className={inputCls} required />
            <FieldError>{err("name")}</FieldError>
          </div>
          <div>
            <Label htmlFor="profile-email" hint="You sign in with this address.">
              Email
            </Label>
            <input
              id="profile-email"
              name="email"
              type="email"
              defaultValue={email}
              className={inputCls}
              required
            />
            <FieldError>{err("email")}</FieldError>
          </div>
        </div>

        <div className="flex justify-end">
          <SubmitButton size="sm" variant="outline" pendingText="Saving…">
            <Save size={14} /> Save details
          </SubmitButton>
        </div>
      </FormSection>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changeOwnPassword, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <form action={action} className="grid gap-4">
      <FormSection
        title="Password"
        description="Changing it signs you out of every other device. This one stays signed in."
      >
        {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
        {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

        <div>
          <Label htmlFor="currentPassword">Current password</Label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            className={inputCls}
            required
            autoComplete="current-password"
          />
          <FieldError>{err("currentPassword")}</FieldError>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="newPassword" hint="At least 8 characters, mixing letters and numbers.">
              New password
            </Label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              className={inputCls}
              required
              autoComplete="new-password"
            />
            <FieldError>{err("newPassword")}</FieldError>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Repeat new password</Label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className={inputCls}
              required
              autoComplete="new-password"
            />
            <FieldError>{err("confirmPassword")}</FieldError>
          </div>
        </div>

        <div className="flex justify-end">
          <SubmitButton size="sm" variant="outline" pendingText="Changing…">
            <KeyRound size={14} /> Change password
          </SubmitButton>
        </div>
      </FormSection>
    </form>
  );
}
