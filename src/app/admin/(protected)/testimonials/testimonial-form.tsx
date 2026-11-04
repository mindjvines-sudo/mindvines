"use client";

import { useActionState } from "react";
import { CONTENT_STATUSES } from "@/lib/constants";
import { MediaPicker } from "@/components/admin/media-picker";
import { Card } from "@/components/admin/ui/card";
import { Field, FormFooter, FormSection, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import { statusLabel } from "@/components/admin/ui/badge";
import type { MediaItem } from "@/types/media";
import type { TestimonialFormState } from "./actions";

export type TestimonialFormAction = (
  state: TestimonialFormState,
  formData: FormData
) => Promise<TestimonialFormState>;

export type TestimonialFormDefaults = {
  authorName?: string;
  authorRole?: string;
  company?: string;
  quote?: string;
  image?: MediaItem | null;
  rating?: number;
  status?: string;
};

export function TestimonialForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: TestimonialFormAction;
  defaultValues?: TestimonialFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;

  return (
    <Card className="max-w-5xl">
      <form action={formAction} noValidate>
        <FormSection title="Patient" description="Who the feedback is from, as it should appear on the website.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" htmlFor="authorName" error={errors?.authorName} required className="sm:col-span-2">
              <Input
                id="authorName"
                name="authorName"
                defaultValue={defaultValues?.authorName}
                required
                invalid={!!errors?.authorName}
              />
            </Field>
            <Field label="Designation" htmlFor="authorRole" hint="For example: Marathon runner, Patient">
              <Input id="authorRole" name="authorRole" defaultValue={defaultValues?.authorRole} />
            </Field>
            <Field label="Company" htmlFor="company">
              <Input id="company" name="company" defaultValue={defaultValues?.company} />
            </Field>
          </div>
          <div className="max-w-sm">
            <MediaPicker name="image" label="Photo" folder="testimonials" initial={defaultValues?.image ?? null} />
          </div>
        </FormSection>

        <FormSection title="Feedback" description="Shown on the Home and About pages.">
          <Field
            label="Testimonial"
            htmlFor="quote"
            error={errors?.quote}
            hint="Cards fit about 50 words; longer text is cut off with “…”."
            required
          >
            <Textarea
              id="quote"
              name="quote"
              rows={5}
              required
              defaultValue={defaultValues?.quote}
              invalid={!!errors?.quote}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Rating" htmlFor="rating" error={errors?.rating} hint="1–5, half stars allowed. Optional.">
              <Input
                id="rating"
                name="rating"
                type="number"
                min={1}
                max={5}
                step={0.5}
                defaultValue={defaultValues?.rating}
                invalid={!!errors?.rating}
              />
            </Field>
            <Field label="Status" htmlFor="status" hint="Only active testimonials appear on the website.">
              <Select id="status" name="status" defaultValue={defaultValues?.status ?? "DRAFT"}>
                {CONTENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status, "testimonial")}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormFooter>
          {state?.message && <Alert tone="error" className="sm:mr-auto">{state.message}</Alert>}
          <ButtonLink href="/admin/testimonials" variant="secondary">
            Cancel
          </ButtonLink>
          <button type="submit" disabled={pending} className={buttonClasses()}>
            {pending ? "Saving…" : submitLabel}
          </button>
        </FormFooter>
      </form>
    </Card>
  );
}
