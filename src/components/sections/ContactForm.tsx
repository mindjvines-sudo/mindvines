"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";

import { submitEnquiryAction, type ContactFormState } from "@/app/(public)/actions";
import { CONTACT } from "@/lib/content";
import { cn } from "@/lib/utils";

const initialState: ContactFormState = undefined;

/** The live form's fields: pill-shaped, stone fill, a 2px warm-grey rim. */
const FIELD =
  "block h-[44px] w-full rounded-full border-2 bg-stone px-[18px] font-ui text-[15px] text-ink outline-none transition-colors duration-200 focus:border-tan";

export function ContactForm() {
  const { form } = CONTACT;
  const [state, formAction, pending] = useActionState(submitEnquiryAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Submitting through onSubmit rather than the `action` prop stops React
  // from clearing the fields after every attempt, so a visitor keeps what
  // they typed when validation fails. The form is cleared only on success.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  const errors = state?.errors;

  return (
    <form ref={formRef} onSubmit={handleSubmit} aria-label={CONTACT.formHeading} noValidate className="font-ui">
      <div className="grid grid-cols-1 gap-x-[25px] gap-y-[20px] sm:grid-cols-2">
        <Field label={form.name} required error={errors?.name}>
          <input
            name="name"
            type="text"
            autoComplete="given-name"
            required
            maxLength={120}
            aria-invalid={Boolean(errors?.name)}
            className={fieldClass(errors?.name)}
          />
        </Field>

        <Field label={form.childAge} error={errors?.childAge}>
          <input
            name="childAge"
            type="text"
            inputMode="numeric"
            maxLength={20}
            aria-invalid={Boolean(errors?.childAge)}
            className={fieldClass(errors?.childAge)}
          />
        </Field>

        <Field label={form.email} required error={errors?.email}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors?.email)}
            className={fieldClass(errors?.email)}
          />
        </Field>

        <Field label={form.phone} error={errors?.phone}>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors?.phone)}
            className={fieldClass(errors?.phone)}
          />
        </Field>

        <Field label={form.message} error={errors?.message} className="sm:col-span-2">
          <textarea
            name="message"
            rows={3}
            maxLength={2000}
            aria-invalid={Boolean(errors?.message)}
            className={cn(fieldClass(errors?.message), "h-[92px] resize-none rounded-[20px] py-[10px]")}
          />
        </Field>
      </div>

      {/* Honeypot: hidden from real visitors via CSS, not `type="hidden"`,
          so form-filling bots that skip hidden inputs still populate it. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-[14px] h-[42px] w-full rounded-full bg-cocoa text-[16px] text-paper transition-colors duration-200 hover:bg-ink disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Sending…" : form.submit}
      </button>

      <div aria-live="polite">
        {state?.success && <p className="mt-[14px] text-center text-[15px] text-ink">{form.success}</p>}
        {state?.message && (
          <p role="alert" className="mt-[14px] text-center text-[15px] text-[#b3261e]">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function fieldClass(error?: string[]) {
  return cn(FIELD, error ? "border-[#b3261e]" : "border-field-line");
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-[8px] block text-[14px] text-ink">
        {label}
        {required && <span aria-hidden> *</span>}
      </span>
      {children}
      {error && <span className="mt-[6px] block text-[13px] leading-[18px] text-[#b3261e]">{error[0]}</span>}
    </label>
  );
}
