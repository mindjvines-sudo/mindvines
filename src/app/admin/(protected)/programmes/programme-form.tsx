"use client";

import { startTransition, useActionState } from "react";
import { Card } from "@/components/admin/ui/card";
import { Field, FormFooter, FormSection, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";
import type { ProgrammeInput } from "@/validations/programme.schema";
import type { ProgrammeFormState } from "./actions";

export function ProgrammeForm({ action, defaultValues, submitLabel, categories }: {
  action: (state: ProgrammeFormState, data: FormData) => Promise<ProgrammeFormState>;
  defaultValues?: Partial<ProgrammeInput>;
  submitLabel: string;
  categories: { id: string; name: string; selectionLimit: number; active: boolean }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <Card className="max-w-3xl">
      <form onSubmit={submit} noValidate>
        <FormSection title="Programme" description="What a child takes part in. Each subscription plan belongs to a programme, one plan per duration.">
          <Field label="Name" htmlFor="name" error={errors?.name} required hint="Shown to parents in the registration form's Programme field, e.g. “Writing & Sketching”.">
            <Input id="name" name="name" maxLength={80} defaultValue={defaultValues?.name} invalid={!!errors?.name} required />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Age group" htmlFor="ageGroup" error={errors?.ageGroup} required>
              <Select id="ageGroup" name="ageGroup" defaultValue={defaultValues?.ageGroup ?? "9-12"} invalid={!!errors?.ageGroup}>
                {SUBSCRIPTION_AGE_GROUPS.map((group) => <option key={group} value={group}>Ages {group}</option>)}
              </Select>
            </Field>
            <Field label="Display order" htmlFor="displayOrder" error={errors?.displayOrder} hint="Lower numbers come first in the Programme field.">
              <Input id="displayOrder" name="displayOrder" type="number" min={0} max={10000} step={1} defaultValue={defaultValues?.displayOrder ?? 0} invalid={!!errors?.displayOrder} />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" error={errors?.description} hint="For the admin; not shown to parents.">
            <Textarea id="description" name="description" rows={3} maxLength={500} defaultValue={defaultValues?.description} invalid={!!errors?.description} />
          </Field>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input name="active" type="checkbox" defaultChecked={defaultValues?.active ?? true} className="size-4 accent-teal-700" />
            Offer this programme in the registration form
          </label>
        </FormSection>

        <FormSection title="Topic lists" description="On page 2 of the registration form, families pick favourites from each list ticked here, in this order.">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500">No topic categories yet. Add them in Topic Management → Categories.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="categories"
                    value={category.id}
                    defaultChecked={defaultValues?.categories?.includes(category.id)}
                    className="size-4 accent-teal-700"
                  />
                  <span>
                    {category.name}
                    <span className="text-slate-400"> · pick {category.selectionLimit}{category.active ? "" : " · switched off"}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          {errors?.categories && <p className="text-xs font-medium text-red-600">{errors.categories[0]}</p>}
        </FormSection>

        <FormFooter>
          {state?.message && <Alert tone="error" className="sm:mr-auto">{state.message}</Alert>}
          <ButtonLink href="/admin/programmes" variant="secondary">Cancel</ButtonLink>
          <button type="submit" disabled={pending} className={buttonClasses()}>{pending ? "Saving…" : submitLabel}</button>
        </FormFooter>
      </form>
    </Card>
  );
}
