"use client";

import { useActionState, useState } from "react";
import { CONTENT_STATUSES } from "@/lib/constants";
import { SERVICE_ICONS } from "@/lib/service-icons";
import { slugify } from "@/lib/utils";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { MediaPicker } from "@/components/admin/media-picker";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { Field, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { buttonClasses } from "@/components/admin/ui/button";
import { statusLabel } from "@/components/admin/ui/badge";
import { CheckCircleIcon, ChatIcon, DocumentIcon, GlobeIcon, ImageIcon, LayersIcon } from "@/components/admin/icons";
import type { MediaItem } from "@/types/media";
import { ListEditor } from "@/components/admin/list-editor";
import type { ServiceFormState } from "./actions";

export type ServiceFormAction = (state: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;

export type ServiceFormDefaults = {
  name?: string;
  slug?: string;
  tagline?: string;
  shortDescription?: string;
  description?: string;
  icon?: string;
  image?: MediaItem | null;
  bannerImage?: MediaItem | null;
  features?: string[];
  process?: { title: string; description: string }[];
  faqs?: { question: string; answer: string }[];
  status?: string;
  seo?: {
    title?: string;
    description?: string;
    canonical?: string;
    keywords?: string[];
    ogImage?: string;
  };
};

export function ServiceForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: ServiceFormAction;
  defaultValues?: ServiceFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;

  // The slug follows the name until it's edited by hand, or when editing an
  // existing service, whose URL shouldn't drift with a renamed title.
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [slug, setSlug] = useState(defaultValues?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.slug));

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader icon={DocumentIcon} title="Service" description="The card on /services and the top of its own page" />
          <div className="flex flex-col gap-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="name" error={errors?.name} required>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!slugTouched) setSlug(slugify(event.target.value));
                  }}
                  required
                  invalid={!!errors?.name}
                />
              </Field>
              <Field label="Slug" htmlFor="slug" error={errors?.slug} hint={`thefysit.com/services/${slug || "your-slug"}`} required>
                <Input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value);
                  }}
                  required
                  invalid={!!errors?.slug}
                />
              </Field>
            </div>
            <Field
              label="Tagline"
              htmlFor="tagline"
              error={errors?.tagline}
              hint="A short line above the overview. For example: Expert care in the comfort of your home"
            >
              <Input id="tagline" name="tagline" defaultValue={defaultValues?.tagline} invalid={!!errors?.tagline} />
            </Field>
            <Field
              label="Short description"
              htmlFor="shortDescription"
              error={errors?.shortDescription}
              hint="One or two sentences for the service card and search results."
              required
            >
              <Textarea
                id="shortDescription"
                name="shortDescription"
                rows={2}
                defaultValue={defaultValues?.shortDescription}
                required
                invalid={!!errors?.shortDescription}
              />
            </Field>
            <Field label="Overview" htmlFor="description" error={errors?.description} required>
              <RichTextEditor
                name="description"
                initialContent={defaultValues?.description}
                placeholder="Describe the service, who it’s for and what a session involves…"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={CheckCircleIcon}
            title="Key benefits"
            description="Shown as a checklist on the service page. Leave empty to hide the section."
          />
          <div className="flex flex-col gap-2 p-5">
            <ListEditor
              name="features"
              asStrings
              fields={[{ key: "text", label: "Benefit", placeholder: "For example: Personalised treatment plan" }]}
              initial={defaultValues?.features?.map((text) => ({ text }))}
              addLabel="Add benefit"
              emptyText="No benefits yet."
              invalid={!!errors?.features}
            />
            {errors?.features && <p className="text-[13px] text-red-600">{errors.features[0]}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={LayersIcon}
            title="Treatment process"
            description="Numbered steps on the service page. Leave empty to hide the section."
          />
          <div className="flex flex-col gap-2 p-5">
            <ListEditor
              name="process"
              max={10}
              fields={[
                { key: "title", label: "Step title", placeholder: "For example: Initial assessment" },
                { key: "description", label: "Step description", placeholder: "What happens in this step", multiline: true },
              ]}
              initial={defaultValues?.process}
              addLabel="Add step"
              emptyText="No steps yet."
              invalid={!!errors?.process}
            />
            {errors?.process && <p className="text-[13px] text-red-600">{errors.process[0]}</p>}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={ChatIcon}
            title="Frequently asked questions"
            description="An accordion on the service page, also marked up for search engines."
          />
          <div className="flex flex-col gap-2 p-5">
            <ListEditor
              name="faqs"
              fields={[
                { key: "question", label: "Question" },
                { key: "answer", label: "Answer", multiline: true },
              ]}
              initial={defaultValues?.faqs}
              addLabel="Add FAQ"
              emptyText="No FAQs yet."
              invalid={!!errors?.faqs}
            />
            {errors?.faqs && <p className="text-[13px] text-red-600">{errors.faqs[0]}</p>}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6 xl:sticky xl:top-24">
        <Card>
          <CardHeader icon={LayersIcon} title="Publishing" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Status" htmlFor="status" hint="Only published services appear on the website.">
              <Select id="status" name="status" defaultValue={defaultValues?.status ?? "DRAFT"}>
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
          <CardHeader icon={ImageIcon} title="Images" />
          <div className="flex flex-col gap-5 p-5">
            <MediaPicker name="image" label="Card & cover image" folder="services" initial={defaultValues?.image ?? null} />
            <MediaPicker
              name="bannerImage"
              label="Page banner (optional)"
              folder="services"
              initial={defaultValues?.bannerImage ?? null}
            />
            <Field label="Card icon" htmlFor="icon" error={errors?.icon} hint="The line icon on the service card.">
              <Select id="icon" name="icon" defaultValue={defaultValues?.icon ?? SERVICE_ICONS[0].value}>
                {SERVICE_ICONS.map((icon) => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={GlobeIcon} title="SEO" description="How the service appears in search and social shares" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="SEO title" htmlFor="seoTitle" hint="Up to 70 characters. Defaults to the name; “| The Fysit” is added automatically.">
              <Input id="seoTitle" name="seoTitle" defaultValue={defaultValues?.seo?.title} invalid={!!errors?.seo} />
            </Field>
            <Field label="SEO description" htmlFor="seoDescription" hint="Up to 160 characters. Defaults to the short description.">
              <Textarea id="seoDescription" name="seoDescription" rows={3} defaultValue={defaultValues?.seo?.description} />
            </Field>
            <Field label="Canonical URL" htmlFor="seoCanonical">
              <Input id="seoCanonical" name="seoCanonical" defaultValue={defaultValues?.seo?.canonical} />
            </Field>
            <Field label="Keywords" htmlFor="seoKeywords" hint="Separate with commas.">
              <Input id="seoKeywords" name="seoKeywords" defaultValue={defaultValues?.seo?.keywords?.join(", ")} />
            </Field>
            <Field label="OG image URL" htmlFor="seoOgImage" hint="Defaults to the cover image.">
              <Input id="seoOgImage" name="seoOgImage" defaultValue={defaultValues?.seo?.ogImage} />
            </Field>
            {errors?.seo && <p className="text-[13px] text-red-600">{errors.seo[0]}</p>}
          </div>
        </Card>
      </div>
    </form>
  );
}
