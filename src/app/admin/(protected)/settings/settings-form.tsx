"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsFormState } from "./actions";
import { Card } from "@/components/admin/ui/card";
import { Field, FormFooter, FormSection, Input, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { buttonClasses } from "@/components/admin/ui/button";

export function SettingsForm({
  defaultValues,
}: {
  defaultValues: { siteName: string; tagline?: string; contactEmail?: string; contactPhone?: string; address?: string };
}) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(updateSettingsAction, undefined);
  const errors = state?.errors;

  return (
    <Card className="max-w-5xl">
      <form action={formAction} noValidate>
        <FormSection title="Clinic identity" description="The clinic’s name and tagline.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Site name" htmlFor="siteName" error={errors?.siteName} required>
              <Input
                id="siteName"
                name="siteName"
                defaultValue={defaultValues.siteName}
                required
                invalid={!!errors?.siteName}
              />
            </Field>
            <Field label="Tagline" htmlFor="tagline">
              <Input id="tagline" name="tagline" defaultValue={defaultValues.tagline} />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Contact details"
          description="Shown on the website’s Contact page and used for its map. Leave a field blank to use the default."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Contact email" htmlFor="contactEmail" error={errors?.contactEmail}>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={defaultValues.contactEmail}
                invalid={!!errors?.contactEmail}
              />
            </Field>
            <Field label="Contact phone" htmlFor="contactPhone" error={errors?.contactPhone}>
              <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={defaultValues.contactPhone} />
            </Field>
          </div>
          <Field label="Clinic address" htmlFor="address" error={errors?.address}>
            <Textarea id="address" name="address" rows={3} defaultValue={defaultValues.address} />
          </Field>
        </FormSection>

        <FormFooter>
          <div aria-live="polite" className="sm:mr-auto">
            {state?.success && <Alert tone="success">Settings saved. The website has been updated.</Alert>}
            {state?.message && <Alert tone="error">{state.message}</Alert>}
          </div>
          <button type="submit" disabled={pending} className={buttonClasses()}>
            {pending ? "Saving…" : "Save settings"}
          </button>
        </FormFooter>
      </form>
    </Card>
  );
}
