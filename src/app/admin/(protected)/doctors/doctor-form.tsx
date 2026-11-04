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
import type { DoctorFormState } from "./actions";

export type DoctorFormAction = (state: DoctorFormState, formData: FormData) => Promise<DoctorFormState>;

export type DoctorFormDefaults = {
  name?: string;
  designation?: string;
  qualifications?: string;
  experienceYears?: number;
  bio?: string;
  photo?: MediaItem | null;
  socialLinks?: { facebook?: string; x?: string; whatsapp?: string };
  status?: string;
};

const SOCIAL_FIELDS = [
  { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { name: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { name: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/91…" },
] as const;

export function DoctorForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: DoctorFormAction;
  defaultValues?: DoctorFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;

  return (
    <Card className="max-w-5xl">
      <form action={formAction} noValidate>
        <FormSection title="Doctor" description="How the doctor appears on the team cards on the website.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" error={errors?.name} required hint="For example: Dr. Veena Vijayan">
              <Input id="name" name="name" defaultValue={defaultValues?.name} required invalid={!!errors?.name} />
            </Field>
            <Field
              label="Designation"
              htmlFor="designation"
              error={errors?.designation}
              required
              hint="Shown under the name. For example: Chief Physiotherapist"
            >
              <Input
                id="designation"
                name="designation"
                defaultValue={defaultValues?.designation}
                required
                invalid={!!errors?.designation}
              />
            </Field>
            <Field
              label="Qualifications"
              htmlFor="qualifications"
              error={errors?.qualifications}
              hint="Shown under the designation. For example: BPT, MPT (Ortho)"
            >
              <Input id="qualifications" name="qualifications" defaultValue={defaultValues?.qualifications} />
            </Field>
            <Field label="Years of experience" htmlFor="experienceYears" error={errors?.experienceYears}>
              <Input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min={0}
                max={80}
                step={1}
                defaultValue={defaultValues?.experienceYears}
                invalid={!!errors?.experienceYears}
              />
            </Field>
          </div>
          <div className="max-w-sm">
            <MediaPicker name="photo" label="Photo" folder="doctors" initial={defaultValues?.photo ?? null} />
          </div>
          <Field
            label="Short bio"
            htmlFor="bio"
            error={errors?.bio}
            hint="Background, specialisations and approach. Kept on record for the doctor's profile."
          >
            <Textarea id="bio" name="bio" rows={5} defaultValue={defaultValues?.bio} invalid={!!errors?.bio} />
          </Field>
        </FormSection>

        <FormSection
          title="Social links"
          description="Shown when a visitor hovers the doctor's photo. Leave empty to hide a link."
        >
          <div className="grid gap-5 sm:grid-cols-3">
            {SOCIAL_FIELDS.map((social) => {
              const error = errors?.[`socialLinks.${social.name}`];
              return (
                <Field key={social.name} label={social.label} htmlFor={social.name} error={error}>
                  <Input
                    id={social.name}
                    name={social.name}
                    type="url"
                    placeholder={social.placeholder}
                    defaultValue={defaultValues?.socialLinks?.[social.name]}
                    invalid={!!error}
                  />
                </Field>
              );
            })}
          </div>
        </FormSection>

        <FormSection title="Visibility">
          <div className="max-w-sm">
            <Field label="Status" htmlFor="status" hint="Only active doctors appear on the website and in the booking forms.">
              <Select id="status" name="status" defaultValue={defaultValues?.status ?? "DRAFT"}>
                {CONTENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status, "doctor")}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormFooter>
          {state?.message && <Alert tone="error" className="sm:mr-auto">{state.message}</Alert>}
          <ButtonLink href="/admin/doctors" variant="secondary">
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
