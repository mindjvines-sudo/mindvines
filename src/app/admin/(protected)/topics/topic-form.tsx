"use client";

import { startTransition, useActionState } from "react";
import { Card } from "@/components/admin/ui/card";
import { Field, FormFooter, FormSection, Input, Select } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import type { TopicInput } from "@/validations/topic.schema";
import type { TopicFormState } from "./actions";

export function TopicForm({ action, defaultValues, submitLabel, categories, cancelHref, versionName }: {
  action: (state: TopicFormState, data: FormData) => Promise<TopicFormState>;
  defaultValues?: Partial<TopicInput>;
  submitLabel: string;
  categories: { id: string; name: string }[];
  cancelHref: string;
  versionName: string;
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
        <FormSection title="Topic" description={`In the “${versionName}” topic set.`}>
          <Field label="Topic" htmlFor="title" error={errors?.title} required>
            <Input id="title" name="title" maxLength={160} defaultValue={defaultValues?.title} invalid={!!errors?.title} placeholder="Dancing in the Rain" required />
          </Field>
          <Field label="Category" htmlFor="category" error={errors?.category} required>
            <Select id="category" name="category" defaultValue={defaultValues?.category ?? categories[0]?.id} invalid={!!errors?.category}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </Field>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input name="active" type="checkbox" defaultChecked={defaultValues?.active ?? true} className="size-4 accent-teal-700" />
            Show this topic in the registration form
          </label>
        </FormSection>

        <FormFooter>
          {state?.message && <Alert tone="error" className="sm:mr-auto">{state.message}</Alert>}
          <ButtonLink href={cancelHref} variant="secondary">Cancel</ButtonLink>
          <button type="submit" disabled={pending} className={buttonClasses()}>{pending ? "Saving…" : submitLabel}</button>
        </FormFooter>
      </form>
    </Card>
  );
}
