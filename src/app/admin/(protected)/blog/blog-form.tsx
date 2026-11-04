"use client";

import { useActionState } from "react";
import { CONTENT_STATUSES } from "@/lib/constants";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { MediaPicker } from "@/components/admin/media-picker";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { Field, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { buttonClasses } from "@/components/admin/ui/button";
import { statusLabel } from "@/components/admin/ui/badge";
import { DocumentIcon, GlobeIcon, ImageIcon, LayersIcon } from "@/components/admin/icons";
import type { MediaItem } from "@/types/media";
import type { BlogFormState } from "./actions";

export type BlogFormAction = (state: BlogFormState, formData: FormData) => Promise<BlogFormState>;

export type BlogFormDefaults = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featuredImage?: MediaItem | null;
  status?: string;
  seo?: {
    title?: string;
    description?: string;
    canonical?: string;
    keywords?: string[];
    ogImage?: string;
  };
};

export function BlogForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: BlogFormAction;
  defaultValues?: BlogFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;

  return (
    <form action={formAction} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <Card>
        <CardHeader icon={DocumentIcon} title="Post content" />
        <div className="flex flex-col gap-5 p-5">
          <Field label="Title" htmlFor="title" error={errors?.title} required>
            <Input id="title" name="title" defaultValue={defaultValues?.title} required invalid={!!errors?.title} />
          </Field>
          <Field
            label="Slug"
            htmlFor="slug"
            error={errors?.slug}
            hint="The post’s address: thefysit.com/blog/your-slug"
            required
          >
            <Input id="slug" name="slug" defaultValue={defaultValues?.slug} required invalid={!!errors?.slug} />
          </Field>
          <Field label="Excerpt" htmlFor="excerpt" hint="A one or two sentence summary shown on blog cards.">
            <Textarea id="excerpt" name="excerpt" rows={2} defaultValue={defaultValues?.excerpt} />
          </Field>
          <Field label="Content" htmlFor="content" error={errors?.content}>
            <RichTextEditor name="content" initialContent={defaultValues?.content} placeholder="Write your post…" />
          </Field>
        </div>
      </Card>

      <div className="flex flex-col gap-6 xl:sticky xl:top-24">
        <Card>
          <CardHeader icon={LayersIcon} title="Publishing" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Status" htmlFor="status">
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
          <CardHeader icon={ImageIcon} title="Featured image" />
          <div className="p-5">
            <MediaPicker
              name="featuredImage"
              label="Featured image"
              hideLabel
              folder="blog"
              initial={defaultValues?.featuredImage ?? null}
            />
          </div>
        </Card>

        <Card>
          <CardHeader icon={GlobeIcon} title="SEO" description="How the post appears in search and social shares" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="SEO title" htmlFor="seoTitle">
              <Input id="seoTitle" name="seoTitle" defaultValue={defaultValues?.seo?.title} />
            </Field>
            <Field label="SEO description" htmlFor="seoDescription">
              <Textarea id="seoDescription" name="seoDescription" rows={3} defaultValue={defaultValues?.seo?.description} />
            </Field>
            <Field label="Canonical URL" htmlFor="seoCanonical">
              <Input id="seoCanonical" name="seoCanonical" defaultValue={defaultValues?.seo?.canonical} />
            </Field>
            <Field label="Keywords" htmlFor="seoKeywords" hint="Separate with commas.">
              <Input id="seoKeywords" name="seoKeywords" defaultValue={defaultValues?.seo?.keywords?.join(", ")} />
            </Field>
            <Field label="OG image URL" htmlFor="seoOgImage">
              <Input id="seoOgImage" name="seoOgImage" defaultValue={defaultValues?.seo?.ogImage} />
            </Field>
          </div>
        </Card>
      </div>
    </form>
  );
}
