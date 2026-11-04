"use client";

import { useActionState, useState } from "react";
import { CONTENT_STATUSES } from "@/lib/constants";
import { slugify } from "@/lib/utils";
import { ListEditor } from "@/components/admin/list-editor";
import { MediaPicker } from "@/components/admin/media-picker";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { Field, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { buttonClasses } from "@/components/admin/ui/button";
import { statusLabel } from "@/components/admin/ui/badge";
import {
  ChatIcon,
  CheckCircleIcon,
  DocumentIcon,
  GlobeIcon,
  HeartPulseIcon,
  ImageIcon,
  LayersIcon,
  PeopleIcon,
  PhoneIcon,
  StarIcon,
} from "@/components/admin/icons";
import type { MediaItem } from "@/types/media";
import type { LocationFormState } from "./actions";

export type LocationFormAction = (state: LocationFormState, formData: FormData) => Promise<LocationFormState>;

type Title = { lead?: string; accent?: string };

export type LocationFormDefaults = {
  name?: string;
  slug?: string;
  title?: string;
  eyebrow?: string;
  heading?: Title;
  intro?: string;
  address?: { street?: string; area?: string; city?: string };
  phone?: string;
  stats?: { value: string; label: string }[];
  approach?: { title?: Title; paragraphs?: string[]; image?: MediaItem | null };
  services?: { lead?: string; accent?: string; intro?: string };
  serviceItems?: { title: string; description: string; href: string }[];
  conditionsTitle?: Title;
  conditions?: string[];
  why?: { title?: Title; points?: { title: string; body: string }[] };
  corporate?: { title?: string; paragraphs?: string[] };
  faqTitle?: Title;
  faqs?: { question: string; answer: string }[];
  bannerImage?: MediaItem | null;
  teamImage?: MediaItem | null;
  corporateImage?: MediaItem | null;
  seo?: { title?: string; description?: string };
  status?: string;
};

/** A heading's two parts: the plain lead and the italic teal accent. */
function TitleFields({ name, label, value }: { name: string; label: string; value?: Title }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={`${label} — first part`} htmlFor={`${name}.lead`}>
        <Input id={`${name}.lead`} name={`${name}.lead`} defaultValue={value?.lead} />
      </Field>
      <Field label={`${label} — highlighted part`} htmlFor={`${name}.accent`} hint="Shown in italic teal.">
        <Input id={`${name}.accent`} name={`${name}.accent`} defaultValue={value?.accent} />
      </Field>
    </div>
  );
}

function ErrorText({ errors }: { errors?: string[] }) {
  return errors ? <p className="text-[13px] text-red-600">{errors[0]}</p> : null;
}

export function LocationForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: LocationFormAction;
  defaultValues?: LocationFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;
  const d = defaultValues;

  // The address follows the name until edited by hand; an existing clinic's
  // address stays put, since links and search rankings point at it.
  const [name, setName] = useState(d?.name ?? "");
  const [slug, setSlug] = useState(d?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(d?.slug));

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader icon={DocumentIcon} title="Clinic" description="The menu entry and the top of the clinic’s page" />
          <div className="flex flex-col gap-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" error={errors?.name} required hint="Shown in the Locations menu. For example: Kasturi Nagar">
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!slugTouched) setSlug(`physiotherapy-center-in-${slugify(event.target.value)}`);
                  }}
                  invalid={!!errors?.name}
                />
              </Field>
              <Field label="Page address" htmlFor="slug" error={errors?.slug} required hint={`thefysit.com/${slug || "your-address"}`}>
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                  invalid={!!errors?.slug}
                />
              </Field>
            </div>
            <Field label="Page title" htmlFor="title" error={errors?.title} required hint="The large title in the page banner.">
              <Input id="title" name="title" defaultValue={d?.title} invalid={!!errors?.title} />
            </Field>
            <Field label="Eyebrow" htmlFor="eyebrow" hint="The small label above the heading.">
              <Input id="eyebrow" name="eyebrow" defaultValue={d?.eyebrow} />
            </Field>
            <TitleFields name="heading" label="Heading" value={d?.heading} />
            <Field label="Introduction" htmlFor="intro" error={errors?.intro}>
              <Textarea id="intro" name="intro" rows={4} defaultValue={d?.intro} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={PhoneIcon} title="Contact details" description="Shown on the clinic card, the map and in search results" />
          <div className="flex flex-col gap-5 p-5">
            <Field label="Street address" htmlFor="address.street" required error={errors?.address} hint="Also shown under the name in the menu.">
              <Input id="address.street" name="address.street" defaultValue={d?.address?.street} invalid={!!errors?.address} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Area" htmlFor="address.area" required>
                <Input id="address.area" name="address.area" defaultValue={d?.address?.area} invalid={!!errors?.address} />
              </Field>
              <Field label="City" htmlFor="address.city" required>
                <Input id="address.city" name="address.city" defaultValue={d?.address?.city ?? "Bangalore"} invalid={!!errors?.address} />
              </Field>
              <Field label="Phone" htmlFor="phone" required error={errors?.phone}>
                <Input id="phone" name="phone" defaultValue={d?.phone} invalid={!!errors?.phone} />
              </Field>
            </div>
            <p className="text-[13px] text-slate-500">Opening hours come from the site-wide hours, so they match everywhere.</p>
          </div>
        </Card>

        <Card>
          <CardHeader icon={StarIcon} title="Stats" description="Up to three figures under the introduction. Leave empty to hide." />
          <div className="flex flex-col gap-2 p-5">
            <ListEditor
              name="stats"
              max={3}
              fields={[
                { key: "value", label: "Figure", placeholder: "500+" },
                { key: "label", label: "Label", placeholder: "Happy patients" },
              ]}
              initial={d?.stats}
              addLabel="Add stat"
              emptyText="No stats."
              invalid={!!errors?.stats}
            />
            <ErrorText errors={errors?.stats} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={LayersIcon} title="Our approach" description="The section beside the clinic photo" />
          <div className="flex flex-col gap-5 p-5">
            <TitleFields name="approach.title" label="Heading" value={d?.approach?.title} />
            <Field label="Text" htmlFor="approach.paragraphs" hint="Leave a blank line between paragraphs." error={errors?.approach}>
              <Textarea id="approach.paragraphs" name="approach.paragraphs" rows={8} defaultValue={d?.approach?.paragraphs?.join("\n\n")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={HeartPulseIcon} title="Services" description="The numbered service cards. Leave the list empty to hide the section." />
          <div className="flex flex-col gap-5 p-5">
            <TitleFields name="services" label="Heading" value={d?.services} />
            <Field label="Introduction" htmlFor="services.intro">
              <Textarea id="services.intro" name="services.intro" rows={2} defaultValue={d?.services?.intro} />
            </Field>
            <ListEditor
              name="serviceItems"
              max={18}
              fields={[
                { key: "title", label: "Service" },
                { key: "description", label: "Description", multiline: true },
                { key: "href", label: "Link (optional)", placeholder: "Optional link, e.g. /services/…" },
              ]}
              initial={d?.serviceItems}
              addLabel="Add service"
              emptyText="No services."
              invalid={!!errors?.serviceItems}
            />
            <ErrorText errors={errors?.serviceItems} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={CheckCircleIcon} title="Conditions we treat" description="The chips on the dark band. Leave empty to hide the section." />
          <div className="flex flex-col gap-5 p-5">
            <TitleFields name="conditionsTitle" label="Heading" value={d?.conditionsTitle} />
            <Field label="Conditions" htmlFor="conditions" hint="One per line." error={errors?.conditions}>
              <Textarea id="conditions" name="conditions" rows={10} defaultValue={d?.conditions?.join("\n")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={PeopleIcon} title="Why choose us" description="Numbered reasons beside the team photo. Leave empty to hide the section." />
          <div className="flex flex-col gap-5 p-5">
            <TitleFields name="why.title" label="Heading" value={d?.why?.title} />
            <ListEditor
              name="why.points"
              max={8}
              fields={[
                { key: "title", label: "Reason" },
                { key: "body", label: "Explanation", multiline: true },
              ]}
              initial={d?.why?.points}
              addLabel="Add reason"
              emptyText="No reasons."
              invalid={!!errors?.why}
            />
            <ErrorText errors={errors?.why} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={DocumentIcon} title="Corporate wellness" description="The block linking to the Corporate Wellness service" />
          <div className="flex flex-col gap-5 p-5">
            <Field label="Heading" htmlFor="corporate.title">
              <Input id="corporate.title" name="corporate.title" defaultValue={d?.corporate?.title} />
            </Field>
            <Field label="Text" htmlFor="corporate.paragraphs" hint="Leave a blank line between paragraphs." error={errors?.corporate}>
              <Textarea id="corporate.paragraphs" name="corporate.paragraphs" rows={6} defaultValue={d?.corporate?.paragraphs?.join("\n\n")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={ChatIcon} title="Frequently asked questions" description="An accordion, also marked up for search engines. Leave empty to hide." />
          <div className="flex flex-col gap-5 p-5">
            <TitleFields name="faqTitle" label="Heading" value={d?.faqTitle} />
            <ListEditor
              name="faqs"
              fields={[
                { key: "question", label: "Question" },
                { key: "answer", label: "Answer", multiline: true },
              ]}
              initial={d?.faqs}
              addLabel="Add FAQ"
              emptyText="No FAQs."
              invalid={!!errors?.faqs}
            />
            <ErrorText errors={errors?.faqs} />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6 xl:sticky xl:top-24">
        <Card>
          <CardHeader icon={LayersIcon} title="Publishing" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Status" htmlFor="status" hint="Only published clinics appear in the menu and on the website.">
              <Select id="status" name="status" defaultValue={d?.status ?? "DRAFT"}>
                {CONTENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </Select>
            </Field>
            {state?.message && <Alert tone="error">{state.message}</Alert>}
            {errors && !state?.message && <Alert tone="error">Please fix the highlighted fields.</Alert>}
            <button type="submit" disabled={pending} className={buttonClasses({ className: "w-full" })}>
              {pending ? "Saving…" : submitLabel}
            </button>
          </div>
        </Card>

        <Card>
          <CardHeader icon={ImageIcon} title="Photos" description="Each has a default when left empty" />
          <div className="flex flex-col gap-5 p-5">
            <MediaPicker name="bannerImage" label="Page banner" folder="locations" initial={d?.bannerImage ?? null} />
            <MediaPicker name="approachImage" label="Approach photo" folder="locations" initial={d?.approach?.image ?? null} />
            <MediaPicker name="teamImage" label="Team photo" folder="locations" initial={d?.teamImage ?? null} />
            <MediaPicker name="corporateImage" label="Corporate wellness photo" folder="locations" initial={d?.corporateImage ?? null} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={GlobeIcon} title="SEO" description="How the clinic appears in search results" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="SEO title" htmlFor="seo.title" hint="Up to 70 characters. Defaults to the page title; “| The Fysit” is added automatically.">
              <Input id="seo.title" name="seo.title" defaultValue={d?.seo?.title} invalid={!!errors?.seo} />
            </Field>
            <Field label="SEO description" htmlFor="seo.description" hint="Up to 160 characters. Defaults to the introduction.">
              <Textarea id="seo.description" name="seo.description" rows={3} defaultValue={d?.seo?.description} />
            </Field>
            <ErrorText errors={errors?.seo} />
          </div>
        </Card>
      </div>
    </form>
  );
}
