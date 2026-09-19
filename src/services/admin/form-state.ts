/**
 * Form-state shape shared by server actions and the client forms that call
 * them via `useActionState`. Kept free of server imports so client components
 * can import it.
 */
export type FormState = {
  ok?: boolean;
  error?: string;
  field?: string;
  message?: string;
  /** Something worth a second look on a save that DID go through. Never blocks. */
  warning?: string;
};

export const INITIAL_FORM: FormState = {};
