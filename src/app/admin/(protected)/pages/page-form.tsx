"use client";

import { useActionState } from "react";
import { CONTENT_STATUSES } from "@/lib/constants";
import { Card } from "@/components/admin/ui/card";
import { Field, FormFooter, FormSection, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Alert } from "@/components/admin/ui/feedback";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import { statusLabel } from "@/components/admin/ui/badge";
import type { PageFormState } from "./actions";

export type PageFormAction = (state: PageFormState, formData: FormData) => Promise<PageFormState>;

export type PageFormDefaults = {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
  status?: string;
  seo?: {
    title?: string;
    description?: string;
    canonical?: string;
    keywords?: string[];
    ogImage?: string;
  };
};

export function PageForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: PageFormAction;
  defaultValues?: PageFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.errors;

  return (
    <Card className="max-w-5xl">
      <form action={formAction} noValidate>
        <FormSection title="Page" description="The page’s title, address and body.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" error={errors?.title} required>
              <Input id="title" name="title" defaultValue={defaultValues?.title} required invalid={!!errors?.title} />
            </Field>
            <Field label="Slug" htmlFor="slug" error={errors?.slug} required>
              <Input id="slug" name="slug" defaultValue={defaultValues?.slug} required invalid={!!errors?.slug} />
            </Field>
          </div>
          <Field label="Content" htmlFor="content" error={errors?.content} required>
            <Textarea
              id="content"
              name="content"
              rows={12}
              required
              defaultValue={defaultValues?.content}
              invalid={!!errors?.content}
              className="font-mono text-[13px]"
            />
          </Field>
          <Field label="Excerpt" htmlFor="excerpt">
            <Input id="excerpt" name="excerpt" defaultValue={defaultValues?.excerpt} />
          </Field>
          <Field label="Featured image URL" htmlFor="featuredImage">
            <Input id="featuredImage" name="featuredImage" defaultValue={defaultValues?.featuredImage} />
          </Field>
          <Field label="Status" htmlFor="status" className="max-w-xs">
            <Select id="status" name="status" defaultValue={defaultValues?.status ?? "DRAFT"}>
              {CONTENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <FormSection title="SEO" description="How the page appears in search results and social shares.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="SEO title" htmlFor="seoTitle">
              <Input id="seoTitle" name="seoTitle" defaultValue={defaultValues?.seo?.title} />
            </Field>
            <Field label="Canonical URL" htmlFor="seoCanonical">
              <Input id="seoCanonical" name="seoCanonical" defaultValue={defaultValues?.seo?.canonical} />
            </Field>
          </div>
          <Field label="SEO description" htmlFor="seoDescription">
            <Textarea id="seoDescription" name="seoDescription" rows={3} defaultValue={defaultValues?.seo?.description} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Keywords" htmlFor="seoKeywords" hint="Separate with commas.">
              <Input id="seoKeywords" name="seoKeywords" defaultValue={defaultValues?.seo?.keywords?.join(", ")} />
            </Field>
            <Field label="OG image URL" htmlFor="seoOgImage">
              <Input id="seoOgImage" name="seoOgImage" defaultValue={defaultValues?.seo?.ogImage} />
            </Field>
          </div>
        </FormSection>

        <FormFooter>
          {state?.message && <Alert tone="error" className="sm:mr-auto">{state.message}</Alert>}
          <ButtonLink href="/admin/pages" variant="secondary">
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
