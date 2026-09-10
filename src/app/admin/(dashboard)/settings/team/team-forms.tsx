"use client";

import { useActionState, useState } from "react";
import { KeyRound, Plus, Save, Trash2, UserPlus } from "lucide-react";
import { ConfirmForm, Notice, SubmitButton } from "@/components/admin/client";
import { FieldError, Label, inputCls, selectArrow, selectCls } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { INITIAL_FORM, type FormState } from "@/services/admin/form-state";
import {
  createTeamMember,
  removeTeamMember,
  resetTeamPassword,
  updateTeamMember,
} from "@/services/admin/team-actions";
import { Form } from "@/components/ui/form";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  isActive: boolean;
  lastLoginAt: string | null;
}

const ROLE_HELP: Record<TeamMember["role"], string> = {
  OWNER: "Everything, including settings and the team.",
  MANAGER: "Catalogue, orders, customers and marketing.",
  STAFF: "Day-to-day order and inbox work.",
};

/** `id` must be unique per card — several of these render on the team page. */
function RoleSelect({ id, defaultValue }: { id: string; defaultValue: TeamMember["role"] }) {
  const [role, setRole] = useState(defaultValue);
  return (
    <div>
      <Label htmlFor={id}>Role</Label>
      <select
        id={id}
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value as TeamMember["role"])}
        className={selectCls}
        style={selectArrow}
      >
        <option value="STAFF">Staff</option>
        <option value="MANAGER">Manager</option>
        <option value="OWNER">Owner</option>
      </select>
      <p className="mt-1.5 text-[11.5px] text-ink-500">{ROLE_HELP[role]}</p>
    </div>
  );
}

/* ------------------------------ Add a member ----------------------------- */

export function AddMemberForm() {
  const [state, action] = useActionState(createTeamMember, INITIAL_FORM);
  // Remembering the state the form was opened against lets it close itself on a
  // successful save without an effect: a new state object means the action ran.
  const [openedWith, setOpenedWith] = useState<FormState | null>(null);
  const open = openedWith !== null && (openedWith === state || !state.ok);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        {state.ok && state.message ? (
          <Notice tone="ok" className="min-w-[200px] flex-1">
            {state.message}
          </Notice>
        ) : (
          <span />
        )}
        <Button variant="outline" size="sm" onClick={() => setOpenedWith(state)}>
          <UserPlus size={14} /> Add a team member
        </Button>
      </div>
    );
  }

  return (
    <Form action={action} className="grid gap-4 rounded-xl border border-hairline bg-surface p-5">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-900">
        Add a team member
      </h2>
      {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="new-name">Full name</Label>
          <input id="new-name" name="name" className={inputCls} required autoComplete="off" />
          <FieldError>{err("name")}</FieldError>
        </div>
        <div>
          <Label htmlFor="new-email">Email</Label>
          <input
            id="new-email"
            name="email"
            type="email"
            className={inputCls}
            required
            autoComplete="off"
          />
          <FieldError>{err("email")}</FieldError>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <RoleSelect id="role-new" defaultValue="STAFF" />
        <div>
          <Label htmlFor="new-password" hint="At least 8 characters, mixing letters and numbers.">
            Temporary password
          </Label>
          <input
            id="new-password"
            name="password"
            type="text"
            className={`${inputCls} font-mono`}
            required
            autoComplete="new-password"
          />
          <FieldError>{err("password")}</FieldError>
        </div>
      </div>

      <p className="text-[11.5px] leading-relaxed text-ink-500">
        Share the password with them directly. They can change it from{" "}
        <span className="text-ink-700">Your account</span> once signed in.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpenedWith(null)}>
          Cancel
        </Button>
        <SubmitButton size="sm" pendingText="Adding…">
          <Plus size={14} /> Add member
        </SubmitButton>
      </div>
    </Form>
  );
}

/* ------------------------------ Edit a member ---------------------------- */

export function MemberCard({ member, isSelf }: { member: TeamMember; isSelf: boolean }) {
  const [state, action] = useActionState(updateTeamMember, INITIAL_FORM);
  const err = (field: string) => (state.field === field ? state.error : undefined);

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink-950">
            {member.name}
            {isSelf && <span className="ml-2 text-[11.5px] font-normal text-ink-500">(you)</span>}
          </p>
          <p className="truncate text-[12.5px] text-ink-500">{member.email}</p>
        </div>
        <p className="text-[11.5px] text-ink-400">
          {member.lastLoginAt ? `Last signed in ${member.lastLoginAt}` : "Never signed in"}
        </p>
      </div>

      <Form action={action} className="grid gap-4">
        <input type="hidden" name="id" value={member.id} />
        {state.error && !state.field && <Notice tone="error">{state.error}</Notice>}
        {state.ok && state.message && <Notice tone="ok">{state.message}</Notice>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`name-${member.id}`}>Full name</Label>
            <input
              id={`name-${member.id}`}
              name="name"
              defaultValue={member.name}
              className={inputCls}
              required
            />
            <FieldError>{err("name")}</FieldError>
          </div>
          <RoleSelect id={`role-${member.id}`} defaultValue={member.role} />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline bg-canvas p-3.5">
          {/* Your own account stays on: the box is fixed, and a hidden field
              carries the value a disabled input would not submit. */}
          {isSelf && <input type="hidden" name="isActive" value="on" />}
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={member.isActive}
            disabled={isSelf}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-800"
          />
          <span>
            <span className="block text-[13px] font-medium text-ink-900">
              Can sign in to the admin panel
            </span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">
              {isSelf
                ? "You cannot switch off your own account."
                : "Switching this off ends their sessions immediately and keeps their history."}
            </span>
          </span>
        </label>

        <div className="flex justify-end">
          <SubmitButton size="sm" variant="outline" pendingText="Saving…">
            <Save size={14} /> Save
          </SubmitButton>
        </div>
      </Form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <ResetPasswordForm memberId={member.id} name={member.name} />
        {!isSelf && (
          <ConfirmForm
            action={removeTeamMember}
            message={`Remove ${member.name}? Their activity history stays, but the account is gone for good.`}
          >
            <input type="hidden" name="id" value={member.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500 transition-colors hover:text-sale-600"
            >
              <Trash2 size={14} /> Remove
            </button>
          </ConfirmForm>
        )}
      </div>
    </div>
  );
}

function ResetPasswordForm({ memberId, name }: { memberId: string; name: string }) {
  const [state, action] = useActionState(resetTeamPassword, INITIAL_FORM);
  const [openedWith, setOpenedWith] = useState<FormState | null>(null);
  const open = openedWith !== null && (openedWith === state || !state.ok);

  if (!open) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setOpenedWith(state)}>
          <KeyRound size={14} /> Set a new password
        </Button>
        {state.ok && state.message && (
          <span className="text-[12px] text-brand-800">{state.message}</span>
        )}
      </div>
    );
  }

  return (
    <Form action={action} className="flex w-full flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={memberId} />
      <div className="min-w-[220px] flex-1">
        <Label htmlFor={`pw-${memberId}`}>New password for {name}</Label>
        <input
          id={`pw-${memberId}`}
          name="password"
          type="text"
          className={`${inputCls} font-mono`}
          required
          autoComplete="new-password"
        />
        <FieldError>{state.error}</FieldError>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpenedWith(null)}>
        Cancel
      </Button>
      <SubmitButton size="sm" variant="outline" pendingText="Saving…">
        Set password
      </SubmitButton>
    </Form>
  );
}
