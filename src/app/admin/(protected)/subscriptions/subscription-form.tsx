"use client";

import { startTransition, useActionState } from "react";
import { Card } from "@/components/admin/ui/card";
import { Field, FormFooter, FormSection, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import { CONTENT_STATUSES } from "@/lib/constants";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";
import type { SubscriptionInput } from "@/validations/subscription.schema";
import type { SubscriptionFormState } from "./actions";

export function SubscriptionForm({ action, defaultValues, submitLabel }: {
  action: (state: SubscriptionFormState, data: FormData) => Promise<SubscriptionFormState>;
  defaultValues?: SubscriptionInput;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <Card className="max-w-5xl">
      <form onSubmit={submit} noValidate>
        <FormSection title="Plan details" description="Describe the journal programme parents can choose for their child. Plans of the same age group and duration appear side by side, so name each one for what it offers (for example “Writing only”).">
          <Field label="Plan name" htmlFor="name" error={errors?.name} required>
            <Input id="name" name="name" maxLength={120} defaultValue={defaultValues?.name} invalid={!!errors?.name} required />
          </Field>
          <Field label="Description" htmlFor="description" error={errors?.description} required>
            <Textarea id="description" name="description" rows={4} maxLength={1000} defaultValue={defaultValues?.description} invalid={!!errors?.description} required />
          </Field>
          <Field label="Age group" htmlFor="ageGroup" error={errors?.ageGroup} required>
            <Select id="ageGroup" name="ageGroup" defaultValue={defaultValues?.ageGroup ?? "6-8"} invalid={!!errors?.ageGroup}>
              {SUBSCRIPTION_AGE_GROUPS.map((group) => <option key={group} value={group}>Ages {group}</option>)}
            </Select>
          </Field>
        </FormSection>

        <FormSection title="Pricing and inclusions" description="The price is the total in Indian rupees for the entire plan duration.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Total price (INR)" htmlFor="price" error={errors?.price} required>
              <Input id="price" name="price" type="number" min={0} max={1000000} step="0.01" defaultValue={defaultValues?.price} invalid={!!errors?.price} required />
            </Field>
            <Field label="Duration (months)" htmlFor="durationMonths" error={errors?.durationMonths} required>
              <Input id="durationMonths" name="durationMonths" type="number" min={1} max={120} step={1} defaultValue={defaultValues?.durationMonths ?? 3} invalid={!!errors?.durationMonths} required />
            </Field>
            <Field label="Number of journals" htmlFor="journalCount" error={errors?.journalCount} required>
              <Input id="journalCount" name="journalCount" type="number" min={1} max={1000} step={1} defaultValue={defaultValues?.journalCount ?? 6} invalid={!!errors?.journalCount} required />
            </Field>
          </div>
          <Field label="Benefits" htmlFor="features" error={errors?.features} hint="One benefit per line. Up to 20 benefits, 200 characters each.">
            <Textarea id="features" name="features" rows={5} defaultValue={defaultValues?.features.join("\n")} invalid={!!errors?.features} placeholder={"Doorstep pickup and delivery\nEvery entry reviewed"} />
          </Field>
          <Field label="Badge" htmlFor="badge" error={errors?.badge} hint="Optional label on the plan card, such as “Save 27%”.">
            <Input id="badge" name="badge" maxLength={30} defaultValue={defaultValues?.badge} invalid={!!errors?.badge} placeholder="Save 27%" />
          </Field>
          <Field label="Button label" htmlFor="buttonLabel" error={errors?.buttonLabel} hint="Optional text on the plan's button, such as “Choose writing”. Leave empty for “Subscribe now”.">
            <Input id="buttonLabel" name="buttonLabel" maxLength={40} defaultValue={defaultValues?.buttonLabel} invalid={!!errors?.buttonLabel} placeholder="Subscribe now" />
          </Field>
          <Field label="Registration link" htmlFor="registrationUrl" error={errors?.registrationUrl} hint="No longer used: plans are bought through the website's checkout.">
            <Input id="registrationUrl" name="registrationUrl" maxLength={2000} defaultValue={defaultValues?.registrationUrl} invalid={!!errors?.registrationUrl} placeholder="https://… or /registration" />
          </Field>
        </FormSection>

        <FormSection title="Website visibility" description="Only published plans appear on the homepage and subscription plans page.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Status" htmlFor="status" error={errors?.status}>
              <Select id="status" name="status" defaultValue={defaultValues?.status ?? "DRAFT"} invalid={!!errors?.status}>
                {CONTENT_STATUSES.map((status) => <option key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>)}
              </Select>
            </Field>
            <Field label="Display order" htmlFor="displayOrder" error={errors?.displayOrder} hint="Lower numbers appear first within each age group.">
              <Input id="displayOrder" name="displayOrder" type="number" min={0} max={10000} step={1} defaultValue={defaultValues?.displayOrder ?? 0} invalid={!!errors?.displayOrder} required />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input name="featured" type="checkbox" defaultChecked={defaultValues?.featured} className="size-4 accent-teal-700" />
            Highlight as a recommended plan
          </label>
        </FormSection>

        <FormFooter>
          {state?.message && <Alert tone="error" className="sm:mr-auto">{state.message}</Alert>}
          <ButtonLink href="/admin/subscriptions" variant="secondary">Cancel</ButtonLink>
          <button type="submit" disabled={pending} className={buttonClasses()}>{pending ? "Saving…" : submitLabel}</button>
        </FormFooter>
      </form>
    </Card>
  );
}
