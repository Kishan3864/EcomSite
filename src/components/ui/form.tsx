"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The form element for the whole app.
 *
 * Browsers ship their own validation UI — a grey "Please fill out this field."
 * bubble that uses the OS font, sits outside our layout, disappears on the next
 * click and cannot be styled at all. It also speaks whatever language the
 * browser is set to, which is rarely the language of the page.
 *
 * So `noValidate` turns that UI off — but only the UI. The constraints
 * themselves (`required`, `type="email"`, `pattern`, `minLength`) still apply
 * and are still readable through the Constraint Validation API, which is what
 * this component reads on submit. Nothing has to be revalidated by hand and no
 * existing form needs rewriting: keep using `required` as before and the
 * message simply appears in our own design instead of the browser's.
 *
 * On failure it does three things, in the order a person needs them: shows a
 * summary listing every problem at once, marks the offending fields, and moves
 * focus to the first one. Fixing a field clears its error as you type rather
 * than making you submit again to find out.
 */

type FieldError = { name: string; label: string; message: string };

/** The control types the Constraint Validation API applies to. */
type Validatable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isValidatable(el: Element): el is Validatable {
  return (
    (el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement) &&
    !el.disabled &&
    el.type !== "hidden" &&
    el.type !== "submit" &&
    el.type !== "button"
  );
}

/**
 * A human name for the field, preferred in the order a person would recognise
 * it: its visible label, then an accessible name, then the placeholder, and
 * only as a last resort the `name` attribute turned back into words.
 */
function labelFor(el: Validatable): string {
  const id = el.id;
  if (id) {
    const label = el.ownerDocument.querySelector<HTMLLabelElement>(
      `label[for="${CSS.escape(id)}"]`,
    );
    const text = label?.textContent?.trim();
    if (text) return text.replace(/\s*\*$/, "").replace(/:$/, "");
  }

  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria;

  const placeholder = "placeholder" in el ? el.placeholder?.trim() : "";
  if (placeholder) return placeholder.replace(/^(e\.?g\.?|example)[:\s-]*/i, "");

  const name = el.name || el.id;
  if (!name) return "This field";
  return name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Our wording for each way a value can be wrong. A field can override any of
 * them with `data-error-<state>`, for the cases where a generic sentence is not
 * good enough — a pincode, say, wants "Enter a 6-digit pincode", not "does not
 * match the required format".
 */
function messageFor(el: Validatable, label: string): string {
  const v = el.validity;
  const custom = (state: string) => el.dataset[`error${state}`];

  if (v.valueMissing) {
    if (custom("Required")) return custom("Required")!;
    if (el instanceof HTMLSelectElement) return `Choose ${lower(label)}`;
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      return `Select ${lower(label)}`;
    }
    return `Enter ${lower(label)}`;
  }

  if (v.typeMismatch) {
    if (custom("Type")) return custom("Type")!;
    if (el instanceof HTMLInputElement && el.type === "email") {
      return "Enter a valid email address, like name@example.com";
    }
    if (el instanceof HTMLInputElement && el.type === "url") {
      return "Enter a full web address, starting with https://";
    }
    return `${label} is not in the right format`;
  }

  if (v.patternMismatch) {
    return custom("Pattern") ?? `${label} is not in the right format`;
  }
  if (v.tooShort && "minLength" in el) {
    return custom("Short") ?? `${label} must be at least ${el.minLength} characters`;
  }
  if (v.tooLong && "maxLength" in el) {
    return custom("Long") ?? `${label} must be ${el.maxLength} characters or fewer`;
  }
  if (v.rangeUnderflow && "min" in el) {
    return custom("Min") ?? `${label} must be ${el.min} or more`;
  }
  if (v.rangeOverflow && "max" in el) {
    return custom("Max") ?? `${label} must be ${el.max} or less`;
  }
  if (v.stepMismatch) {
    return custom("Step") ?? `${label} is not an allowed value`;
  }
  if (v.badInput) {
    return custom("Bad") ?? `${label} is not a valid value`;
  }

  return el.validationMessage || `${label} is not valid`;
}

function lower(label: string) {
  // "Full name" → "your full name" reads better than "Enter Full name".
  const l = label.charAt(0).toLowerCase() + label.slice(1);
  return /^(your|a|an|the)\b/i.test(l) ? l : `your ${l}`;
}

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /** Hide the summary when a form is short enough that field marks suffice. */
  summary?: boolean;
}

/**
 * React 19 types form submits as SubmitEvent, not FormEvent, so derive the
 * parameter from the prop rather than naming a type that shifts between
 * React versions.
 */
type SubmitEvt = Parameters<NonNullable<FormProps["onSubmit"]>>[0];

export const Form = React.forwardRef<HTMLFormElement, FormProps>(function Form(
  { children, onSubmit, className, summary = true, ...props },
  forwardedRef,
) {
  const innerRef = React.useRef<HTMLFormElement>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [errors, setErrors] = React.useState<FieldError[]>([]);

  React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLFormElement);

  const collect = React.useCallback((form: HTMLFormElement) => {
    const found: FieldError[] = [];
    for (const el of Array.from(form.elements)) {
      if (!isValidatable(el)) continue;
      if (el.validity.valid) {
        el.removeAttribute("aria-invalid");
        continue;
      }
      const label = labelFor(el);
      el.setAttribute("aria-invalid", "true");
      found.push({ name: el.name || el.id, label, message: messageFor(el, label) });
    }
    return found;
  }, []);

  function handleSubmit(event: SubmitEvt) {
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      event.preventDefault();
      const found = collect(form);
      setErrors(found);

      // The summary is the thing that just appeared, so announce it, then put
      // the cursor where the work is.
      requestAnimationFrame(() => {
        summaryRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        const first = Array.from(form.elements).find(
          (el) => isValidatable(el) && !el.validity.valid,
        );
        if (first instanceof HTMLElement) first.focus({ preventScroll: true });
      });
      return;
    }

    setErrors([]);
    onSubmit?.(event);
  }

  /**
   * Clear an error the moment the field is fixed. Waiting for the next submit
   * to tell someone they have corrected it is the part of native validation
   * that annoys people most.
   */
  function handleInput(event: React.FormEvent<HTMLFormElement>) {
    if (errors.length === 0) return;
    const el = event.target;
    if (!(el instanceof HTMLElement) || !isValidatable(el)) return;
    if (!el.validity.valid) return;

    el.removeAttribute("aria-invalid");
    const key = el.name || el.id;
    setErrors((prev) => prev.filter((e) => e.name !== key));
  }

  return (
    <form
      ref={innerRef}
      // Switches off the browser's own bubble. The constraints still apply.
      noValidate
      onSubmit={handleSubmit}
      onInput={handleInput}
      className={className}
      {...props}
    >
      {summary && errors.length > 0 && (
        <div
          ref={summaryRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className={cn(
            "mb-5 border-l-2 border-sale-600 bg-sale-50 px-4 py-3.5",
            "text-[13px] leading-relaxed text-sale-700",
          )}
        >
          <p className="flex items-center gap-2 font-semibold text-sale-700">
            <AlertCircle size={15} className="shrink-0" />
            {errors.length === 1
              ? "There is one thing to fix"
              : `There are ${errors.length} things to fix`}
          </p>
          <ul className="mt-2 space-y-1">
            {errors.map((error) => (
              <li key={`${error.name}-${error.message}`} className="pl-[23px]">
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {children}
    </form>
  );
});
