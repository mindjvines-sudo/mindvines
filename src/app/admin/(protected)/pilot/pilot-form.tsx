"use client";

import { startTransition, useActionState, useState } from "react";
import { Card } from "@/components/admin/ui/card";
import { Field, FormFooter, FormSection, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import {
  PILOT_DISCOUNT_TYPES,
  PILOT_DURATIONS,
  PILOT_DURATION_LABELS,
  PILOT_ELIGIBILITY_LABELS,
  PILOT_ELIGIBILITY_TYPES,
  offerPrice,
  savingsPercent,
} from "@/lib/pilot";
import { formatPlanPrice } from "@/lib/subscriptions";
import type { PilotPlanFormValues } from "@/validations/pilot.schema";
import type { PilotFormState } from "./actions";

type Errors = Partial<Record<keyof PilotPlanFormValues, string[]>> | undefined;

export function PilotForm({ action, defaultValues, submitLabel, basePlans, locked }: {
  action: (state: PilotFormState, data: FormData) => Promise<PilotFormState>;
  basePlans: { id: string; label: string }[];
  defaultValues?: PilotPlanFormValues;
  submitLabel: string;
  /** Places already taken or held: the limit can't go below this. */
  locked?: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors: Errors = state?.errors;
  const [duration, setDuration] = useState(defaultValues?.duration ?? "THREE_MONTHS");
  const [eligibility, setEligibility] = useState(defaultValues?.eligibilityType ?? "PUBLIC");
  const [original, setOriginal] = useState(String(defaultValues?.originalPrice ?? ""));
  const [type, setType] = useState(defaultValues?.discountType ?? "FIXED");
  const [value, setValue] = useState(String(defaultValues?.discountValue ?? ""));

  const originalNumber = Number(original);
  const valueNumber = Number(value);
  const preview = originalNumber > 0 && value !== "" && Number.isFinite(valueNumber) ? offerPrice(originalNumber, type, valueNumber) : null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <Card className="max-w-5xl">
      <form onSubmit={submit} noValidate>
        <FormSection title="Plan details" description="What families see when they choose this pilot offer.">
          <Field label="Pilot plan name" htmlFor="name" error={errors?.name} required>
            <Input id="name" name="name" maxLength={120} defaultValue={defaultValues?.name} invalid={!!errors?.name} required />
          </Field>
          <Field label="Description" htmlFor="description" error={errors?.description}>
            <Textarea id="description" name="description" rows={3} maxLength={1000} defaultValue={defaultValues?.description} invalid={!!errors?.description} />
          </Field>
          <Field label="Registers into" htmlFor="basePlan" error={errors?.basePlan} required hint="The ordinary plan whose programme and topic lists these families register with. The pilot's own price and duration below are what they pay and get.">
            <Select id="basePlan" name="basePlan" defaultValue={defaultValues?.basePlan ?? ""} invalid={!!errors?.basePlan} required>
              <option value="" disabled>Choose a plan</option>
              {basePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.label}</option>)}
            </Select>
          </Field>
        </FormSection>

        <FormSection title="Duration and pricing" description="Prices are in rupees before GST. The pilot price is worked out from the original price and the discount.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Plan duration" htmlFor="duration" error={errors?.duration} required>
              <Select id="duration" name="duration" value={duration} onChange={(event) => setDuration(event.target.value as typeof duration)}>
                {PILOT_DURATIONS.map((item) => <option key={item} value={item}>{PILOT_DURATION_LABELS[item]}</option>)}
              </Select>
            </Field>
            {duration === "CUSTOM" && (
              <Field label="Custom duration (months)" htmlFor="customDuration" error={errors?.customDuration} required>
                <Input id="customDuration" name="customDuration" type="number" min={1} max={120} step={1} defaultValue={defaultValues?.customDuration} invalid={!!errors?.customDuration} required />
              </Field>
            )}
            <Field label="Original price (INR)" htmlFor="originalPrice" error={errors?.originalPrice} required>
              <Input id="originalPrice" name="originalPrice" type="number" min={1} step="0.01" value={original} onChange={(event) => setOriginal(event.target.value)} invalid={!!errors?.originalPrice} required />
            </Field>
            <Field label="Discount type" htmlFor="discountType" error={errors?.discountType} required>
              <Select id="discountType" name="discountType" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                {PILOT_DISCOUNT_TYPES.map((item) => <option key={item} value={item}>{item === "PERCENTAGE" ? "Percentage (%)" : "Fixed amount (₹)"}</option>)}
              </Select>
            </Field>
            <Field label={type === "PERCENTAGE" ? "Discount (%)" : "Discount (₹)"} htmlFor="discountValue" error={errors?.discountValue} required>
              <Input id="discountValue" name="discountValue" type="number" min={0} step="0.01" value={value} onChange={(event) => setValue(event.target.value)} invalid={!!errors?.discountValue} required />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-slate-700">Pilot offer price</span>
              <div className="flex h-10 items-center rounded-xl border border-line bg-slate-50 px-3.5 text-sm text-slate-900" aria-live="polite">
                {preview === null ? "—" : <><strong>{formatPlanPrice(preview)}</strong><span className="ml-2 text-slate-500">{savingsPercent(originalNumber, preview)}% off</span></>}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="Registration limits" description="Enforced on the server. When the limit is reached the plan shows as fully booked and takes no more registrations.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Maximum registrations" htmlFor="maxRegistrations" error={errors?.maxRegistrations} required hint={locked ? `${locked} places are already taken or held.` : undefined}>
              <Input id="maxRegistrations" name="maxRegistrations" type="number" min={Math.max(1, locked ?? 1)} step={1} defaultValue={defaultValues?.maxRegistrations} invalid={!!errors?.maxRegistrations} required />
            </Field>
            <Field label="Children per parent email" htmlFor="maxPerEmail" error={errors?.maxPerEmail} required hint="0 means no limit. 1 stops one parent taking several places.">
              <Input id="maxPerEmail" name="maxPerEmail" type="number" min={0} max={100} step={1} defaultValue={defaultValues?.maxPerEmail ?? 1} invalid={!!errors?.maxPerEmail} required />
            </Field>
            <Field label="Registration opens" htmlFor="startDate" error={errors?.startDate} required>
              <Input id="startDate" name="startDate" type="date" defaultValue={defaultValues?.startDate} invalid={!!errors?.startDate} required />
            </Field>
            <Field label="Registration closes" htmlFor="endDate" error={errors?.endDate} required hint="The whole of this day is included.">
              <Input id="endDate" name="endDate" type="date" defaultValue={defaultValues?.endDate} invalid={!!errors?.endDate} required />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Who can join" description="Restricted plans are never listed publicly. Families reach them with the access code or a link that contains it.">
          <Field label="Eligibility" htmlFor="eligibilityType" error={errors?.eligibilityType} required>
            <Select id="eligibilityType" name="eligibilityType" value={eligibility} onChange={(event) => setEligibility(event.target.value as typeof eligibility)}>
              {PILOT_ELIGIBILITY_TYPES.map((item) => <option key={item} value={item}>{PILOT_ELIGIBILITY_LABELS[item]}</option>)}
            </Select>
          </Field>
          {eligibility !== "PUBLIC" && (
            <Field label="Access code" htmlFor="accessCode" error={errors?.accessCode} hint="Leave empty to generate one. Share the code, or the link /pilot?code=CODE.">
              <Input id="accessCode" name="accessCode" maxLength={32} defaultValue={defaultValues?.accessCode} invalid={!!errors?.accessCode} className="font-mono uppercase" />
            </Field>
          )}
          {eligibility === "EMAIL_LIST" && (
            <Field label="Approved email addresses" htmlFor="allowedEmails" error={errors?.allowedEmails} required hint="One per line (or separated by commas). Only these parents can register, and only with the code.">
              <Textarea id="allowedEmails" name="allowedEmails" rows={5} defaultValue={defaultValues?.allowedEmails} invalid={!!errors?.allowedEmails} />
            </Field>
          )}
        </FormSection>

        <FormSection title="Terms and status">
          <Field label="Terms & conditions" htmlFor="termsAndConditions" error={errors?.termsAndConditions} hint="Shown to families on the pilot page and at checkout.">
            <Textarea id="termsAndConditions" name="termsAndConditions" rows={4} maxLength={5000} defaultValue={defaultValues?.termsAndConditions} invalid={!!errors?.termsAndConditions} />
          </Field>
          <Field label="Status" htmlFor="status" error={errors?.status} hint="Inactive plans are hidden and take no registrations.">
            <Select id="status" name="status" defaultValue={defaultValues?.status ?? "INACTIVE"}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </Field>
        </FormSection>

        <FormFooter>
          {state?.message && <Alert tone="error" className="sm:mr-auto">{state.message}</Alert>}
          <ButtonLink href="/admin/pilot" variant="secondary">Cancel</ButtonLink>
          <button type="submit" disabled={pending} className={buttonClasses()}>{pending ? "Saving…" : submitLabel}</button>
        </FormFooter>
      </form>
    </Card>
  );
}
