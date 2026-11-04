"use client";

import { useActionState, useState } from "react";
import { CONTENT_STATUSES } from "@/lib/constants";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";
import { slugify } from "@/lib/utils";
import { ListEditor, type ListFieldConfig, type ListRowValues } from "@/components/admin/list-editor";
import { NestedListEditor, type NestedGroupValues } from "@/components/admin/nested-list-editor";
import { MediaPicker } from "@/components/admin/media-picker";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { Field, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { buttonClasses } from "@/components/admin/ui/button";
import { statusLabel } from "@/components/admin/ui/badge";
import {
  ChartIcon,
  ChatIcon,
  DocumentIcon,
  GlobeIcon,
  ImageIcon,
  LayersIcon,
  PeopleIcon,
  StarIcon,
} from "@/components/admin/icons";
import type { MediaItem } from "@/types/media";
import type { AgeGroupFormState } from "./actions";

export type AgeGroupFormAction = (state: AgeGroupFormState, formData: FormData) => Promise<AgeGroupFormState>;

export type AgeGroupFormDefaults = {
  title?: string;
  slug?: string;
  subtitle?: string;
  summary?: string;
  cardImage?: MediaItem | null;
  hero?: { heading?: string; subheading?: string; image?: MediaItem | null };
  highlights?: { heading?: string; intro?: string; slides?: ListRowValues[]; note?: string; cta?: { label?: string; href?: string } };
  collections?: NestedGroupValues[];
  stats?: { heading?: string; image?: MediaItem | null; items?: ListRowValues[] };
  plans?: { show?: boolean; ageGroup?: string; heading?: string; intro?: string; priceNote?: string; footnote?: string };
  gallery?: { heading?: string; tabs?: NestedGroupValues[] };
  testimonials?: { heading?: string; items?: ListRowValues[] };
  seo?: { title?: string; description?: string };
  status?: string;
};

const FOLDER = "age-groups";

const SLIDE_FIELDS: ListFieldConfig[] = [
  { key: "image", label: "Image", image: { folder: FOLDER } },
  { key: "caption", label: "Caption", placeholder: "Caption (optional)" },
];

const RATING_OPTIONS = [
  { value: "", label: "No star rating" },
  ...[5, 4, 3, 2, 1].map((stars) => ({ value: String(stars), label: `${stars} star${stars === 1 ? "" : "s"}` })),
];

function ErrorText({ errors }: { errors?: string[] }) {
  return errors ? <p className="text-[13px] text-red-600">{errors[0]}</p> : null;
}

/**
 * One age group: its homepage card, then each section of its page in the
 * order the page shows them. A section with nothing filled in is hidden.
 */
export function AgeGroupForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: AgeGroupFormAction;
  defaultValues?: AgeGroupFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;
  const d = defaultValues;

  // The address follows the title until edited by hand; an existing group's
  // address stays put, since links point at it.
  const [title, setTitle] = useState(d?.title ?? "");
  const [slug, setSlug] = useState(d?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(d?.slug));

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader icon={PeopleIcon} title="Homepage card" description="The card in the homepage’s age groups section, which links to this page" />
          <div className="flex flex-col gap-5 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Title" htmlFor="title" error={errors?.title} required hint="For example: Ages 6–8">
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (!slugTouched) setSlug(slugify(event.target.value));
                  }}
                  invalid={!!errors?.title}
                />
              </Field>
              <Field label="Page address" htmlFor="slug" error={errors?.slug} required hint={`/age-groups/${slug || "your-address"}`}>
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
            <Field label="Subtitle" htmlFor="subtitle" error={errors?.subtitle} hint="For example: Sketching journals">
              <Input id="subtitle" name="subtitle" defaultValue={d?.subtitle} invalid={!!errors?.subtitle} />
            </Field>
            <Field label="Card text" htmlFor="summary" error={errors?.summary}>
              <Textarea id="summary" name="summary" rows={3} defaultValue={d?.summary} invalid={!!errors?.summary} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader icon={ImageIcon} title="Banner" description="Not shown on the page in its current design. The photo is still used for link previews." />
          <div className="flex flex-col gap-5 p-5">
            <Field label="Heading" htmlFor="hero.heading" hint="Defaults to the title.">
              <Input id="hero.heading" name="hero.heading" defaultValue={d?.hero?.heading} invalid={!!errors?.hero} />
            </Field>
            <Field label="Subheading" htmlFor="hero.subheading" hint="Defaults to the subtitle.">
              <Textarea id="hero.subheading" name="hero.subheading" rows={2} defaultValue={d?.hero?.subheading} />
            </Field>
            <ErrorText errors={errors?.hero} />
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={LayersIcon}
            title="Topics"
            description="A grid of topic images under the age badge. With no images, the page shows its built-in topics where it has them, or none."
          />
          <div className="flex flex-col gap-5 p-5">
            <Field label="Heading" htmlFor="highlights.heading">
              <Input id="highlights.heading" name="highlights.heading" defaultValue={d?.highlights?.heading} />
            </Field>
            <Field label="Introduction" htmlFor="highlights.intro">
              <Textarea id="highlights.intro" name="highlights.intro" rows={2} defaultValue={d?.highlights?.intro} />
            </Field>
            <ListEditor
              name="highlights.slides"
              max={12}
              fields={SLIDE_FIELDS}
              initial={d?.highlights?.slides}
              addLabel="Add topic"
              emptyText="No topics."
              invalid={!!errors?.highlights}
            />
            <Field label="Closing note" htmlFor="highlights.note" hint="Shown in a box under the grid. Leave empty to hide.">
              <Input id="highlights.note" name="highlights.note" defaultValue={d?.highlights?.note} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Button text" htmlFor="highlights.cta.label" hint="Leave empty to hide the button.">
                <Input id="highlights.cta.label" name="highlights.cta.label" defaultValue={d?.highlights?.cta?.label} />
              </Field>
              <Field label="Button link" htmlFor="highlights.cta.href" hint="For example: /subscriptions or https://…">
                <Input id="highlights.cta.href" name="highlights.cta.href" defaultValue={d?.highlights?.cta?.href} invalid={!!errors?.highlights} />
              </Field>
            </div>
            <ErrorText errors={errors?.highlights} />
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={DocumentIcon}
            title="Collections"
            description="Each collection is a heading with tags, then rows that alternate photo and text. Leave empty to hide."
          />
          <div className="flex flex-col gap-2 p-5">
            <NestedListEditor
              name="collections"
              noun="Collection"
              max={4}
              fields={[
                { key: "heading", label: "Heading", placeholder: "Sketching journals" },
                { key: "subheading", label: "Subheading", placeholder: "One topic at a time" },
                { key: "tags", label: "Tags", placeholder: "Nature, Family, Festivals", hint: "Separate with commas." },
              ]}
              items={{
                key: "items",
                label: "Rows",
                max: 8,
                fields: [
                  { key: "title", label: "Title", placeholder: "Title" },
                  { key: "body", label: "Text", placeholder: "Text", multiline: true },
                  { key: "image", label: "Photo", image: { folder: FOLDER } },
                ],
                addLabel: "Add row",
                emptyText: "No rows.",
              }}
              initial={d?.collections}
              addLabel="Add collection"
              emptyText="No collections."
              invalid={!!errors?.collections}
            />
            <ErrorText errors={errors?.collections} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={ChartIcon} title="Stats" description="Up to four figures over a photo. Leave the figures empty to hide." />
          <div className="flex flex-col gap-5 p-5">
            <Field label="Heading" htmlFor="stats.heading">
              <Input id="stats.heading" name="stats.heading" defaultValue={d?.stats?.heading} />
            </Field>
            <ListEditor
              name="stats.items"
              max={4}
              fields={[
                { key: "value", label: "Figure", placeholder: "3+" },
                { key: "label", label: "Label", placeholder: "Cities in every cohort" },
              ]}
              initial={d?.stats?.items}
              addLabel="Add stat"
              emptyText="No stats."
              invalid={!!errors?.stats}
            />
            <ErrorText errors={errors?.stats} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={ImageIcon} title="Gallery" description="Tabs, each with its own sliding photos. Leave empty to hide." />
          <div className="flex flex-col gap-5 p-5">
            <Field label="Heading" htmlFor="gallery.heading" hint="Optional.">
              <Input id="gallery.heading" name="gallery.heading" defaultValue={d?.gallery?.heading} />
            </Field>
            <NestedListEditor
              name="gallery.tabs"
              noun="Tab"
              max={6}
              fields={[{ key: "label", label: "Tab name", placeholder: "Writing" }]}
              items={{ key: "slides", label: "Photos", max: 12, fields: SLIDE_FIELDS, addLabel: "Add photo", emptyText: "No photos." }}
              initial={d?.gallery?.tabs}
              addLabel="Add tab"
              emptyText="No tabs."
              invalid={!!errors?.gallery}
            />
            <ErrorText errors={errors?.gallery} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={ChatIcon} title="Testimonials" description="Sliding quote cards. Leave empty to hide." />
          <div className="flex flex-col gap-5 p-5">
            <Field label="Heading" htmlFor="testimonials.heading" hint="Defaults to “What parents say”.">
              <Input id="testimonials.heading" name="testimonials.heading" defaultValue={d?.testimonials?.heading} />
            </Field>
            <ListEditor
              name="testimonials.items"
              max={12}
              fields={[
                { key: "name", label: "Name", placeholder: "Name" },
                { key: "detail", label: "Detail", placeholder: "For example: Parent of Aarav, 7" },
                { key: "quote", label: "Quote", placeholder: "Quote", multiline: true },
                { key: "rating", label: "Rating", options: RATING_OPTIONS },
                { key: "image", label: "Photo", image: { folder: FOLDER } },
              ]}
              initial={d?.testimonials?.items}
              addLabel="Add testimonial"
              emptyText="No testimonials."
              invalid={!!errors?.testimonials}
            />
            <ErrorText errors={errors?.testimonials} />
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={StarIcon}
            title="Subscription plans"
            description="The band at the foot of the page. Each published plan from Subscriptions is a tab; “Subscribe now” opens checkout."
          />
          <div className="flex flex-col gap-5 p-5">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input name="plans.show" type="checkbox" defaultChecked={d?.plans?.show ?? true} className="size-4 accent-teal-700" />
              Show this section
            </label>
            <Field label="Plans to show" htmlFor="plans.ageGroup" hint="Lists the published plans for this age group, from Subscriptions. Choose “None” to hide the section.">
              <Select id="plans.ageGroup" name="plans.ageGroup" defaultValue={d?.plans?.ageGroup ?? ""}>
                <option value="">None</option>
                {SUBSCRIPTION_AGE_GROUPS.map((age) => (
                  <option key={age} value={age}>
                    Ages {age}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Heading" htmlFor="plans.heading" hint="Defaults to “Choose your subscription plan”.">
              <Input id="plans.heading" name="plans.heading" defaultValue={d?.plans?.heading} />
            </Field>
            <Field label="Introduction" htmlFor="plans.intro" hint="Leave a blank line between paragraphs.">
              <Textarea id="plans.intro" name="plans.intro" rows={4} defaultValue={d?.plans?.intro} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Note under the price" htmlFor="plans.priceNote" hint="Leave empty for “plus GST”.">
                <Input id="plans.priceNote" name="plans.priceNote" defaultValue={d?.plans?.priceNote} placeholder="plus GST" />
              </Field>
              <Field label="Note under the button" htmlFor="plans.footnote" hint="Leave empty for “Switch or cancel anytime”.">
                <Input id="plans.footnote" name="plans.footnote" defaultValue={d?.plans?.footnote} placeholder="Switch or cancel anytime" />
              </Field>
            </div>
            <ErrorText errors={errors?.plans} />
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6 xl:sticky xl:top-24">
        <Card>
          <CardHeader icon={LayersIcon} title="Publishing" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Status" htmlFor="status" hint="Only published age groups appear on the website.">
              <Select id="status" name="status" defaultValue={d?.status ?? "DRAFT"}>
                {CONTENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </Select>
            </Field>
            {state?.message && <Alert tone="error">{state.message}</Alert>}
            {errors && !state?.message && <Alert tone="error">Please fix the highlighted sections.</Alert>}
            <button type="submit" disabled={pending} className={buttonClasses({ className: "w-full" })}>
              {pending ? "Saving…" : submitLabel}
            </button>
          </div>
        </Card>

        <Card>
          <CardHeader icon={ImageIcon} title="Photos" />
          <div className="flex flex-col gap-5 p-5">
            <MediaPicker name="cardImage" label="Homepage card" folder={FOLDER} initial={d?.cardImage ?? null} />
            <MediaPicker name="heroImage" label="Page banner" folder={FOLDER} initial={d?.hero?.image ?? null} />
            <MediaPicker name="statsImage" label="Stats background" folder={FOLDER} initial={d?.stats?.image ?? null} />
            <ErrorText errors={errors?.cardImage} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={GlobeIcon} title="SEO" description="How the page appears in search results" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="SEO title" htmlFor="seo.title" hint="Up to 70 characters. Defaults to the title.">
              <Input id="seo.title" name="seo.title" defaultValue={d?.seo?.title} invalid={!!errors?.seo} />
            </Field>
            <Field label="SEO description" htmlFor="seo.description" hint="Up to 160 characters. Defaults to the card text.">
              <Textarea id="seo.description" name="seo.description" rows={3} defaultValue={d?.seo?.description} />
            </Field>
            <ErrorText errors={errors?.seo} />
          </div>
        </Card>
      </div>
    </form>
  );
}
