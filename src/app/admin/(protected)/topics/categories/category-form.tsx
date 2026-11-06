"use client";

import { startTransition, useActionState } from "react";
import { Card } from "@/components/admin/ui/card";
import { Field, FormFooter, FormSection, Input, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import { TOPIC_PICKS } from "@/lib/topics";
import type { TopicCategoryInput } from "@/validations/topic.schema";
import type { CategoryFormState } from "../actions";

export function CategoryForm({ action, defaultValues, submitLabel }: {
  action: (state: CategoryFormState, data: FormData) => Promise<CategoryFormState>;
  defaultValues?: Partial<TopicCategoryInput>;
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
    <Card className="max-w-3xl">
      <form onSubmit={submit} noValidate>
        <FormSection title="Category" description="A list of topics. Programmes choose which lists their families pick from.">
          <Field label="Name" htmlFor="name" error={errors?.name} required hint="For the admin and the order summary, e.g. “Sketching Topics – Category 2”.">
            <Input id="name" name="name" maxLength={80} defaultValue={defaultValues?.name} invalid={!!errors?.name} required />
          </Field>
          <Field label="Heading" htmlFor="heading" error={errors?.heading} required hint="What parents read above the list, e.g. “Pick your 10 favourite sketching topics”.">
            <Input id="heading" name="heading" maxLength={120} defaultValue={defaultValues?.heading} invalid={!!errors?.heading} required />
          </Field>
          <Field label="Description" htmlFor="description" error={errors?.description} hint="Shown under the heading.">
            <Textarea id="description" name="description" rows={3} maxLength={500} defaultValue={defaultValues?.description} invalid={!!errors?.description} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Topics to pick" htmlFor="selectionLimit" error={errors?.selectionLimit} required hint="Exactly this many; a shorter list asks for all of it.">
              <Input id="selectionLimit" name="selectionLimit" type="number" min={1} max={50} step={1} defaultValue={defaultValues?.selectionLimit ?? TOPIC_PICKS} invalid={!!errors?.selectionLimit} />
            </Field>
            <Field label="Display order" htmlFor="displayOrder" error={errors?.displayOrder}>
              <Input id="displayOrder" name="displayOrder" type="number" min={0} max={10000} step={1} defaultValue={defaultValues?.displayOrder ?? 0} invalid={!!errors?.displayOrder} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input name="active" type="checkbox" defaultChecked={defaultValues?.active ?? true} className="size-4 accent-teal-700" />
            Show this list in the registration form
          </label>
        </FormSection>

        <FormFooter>
          {state?.message && <Alert tone="error" className="sm:mr-auto">{state.message}</Alert>}
          <ButtonLink href="/admin/topics/categories" variant="secondary">Cancel</ButtonLink>
          <button type="submit" disabled={pending} className={buttonClasses()}>{pending ? "Saving…" : submitLabel}</button>
        </FormFooter>
      </form>
    </Card>
  );
}
