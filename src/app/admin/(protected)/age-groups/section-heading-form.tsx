"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/admin/ui/form";
import { buttonClasses } from "@/components/admin/ui/button";
import { updateSectionHeadingAction } from "./actions";

/** The heading above the homepage's age group cards. */
export function SectionHeadingForm({ heading, fallback, disabled }: { heading: string; fallback: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(updateSectionHeadingAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end" noValidate>
      <Field
        label="Section heading"
        htmlFor="heading"
        error={state?.error ? [state.error] : undefined}
        hint={state?.saved ? "Saved." : `Shown above the cards. Leave empty for “${fallback}”.`}
        className="flex-1"
      >
        <Input id="heading" name="heading" defaultValue={heading} placeholder={fallback} disabled={disabled} invalid={!!state?.error} />
      </Field>
      {!disabled && (
        <button type="submit" disabled={pending} className={buttonClasses({ variant: "secondary", className: "sm:mb-[22px]" })}>
          {pending ? "Saving…" : "Save heading"}
        </button>
      )}
    </form>
  );
}
