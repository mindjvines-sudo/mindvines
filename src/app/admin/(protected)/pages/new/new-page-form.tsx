"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPageAction } from "../actions";
import { Card } from "@/components/admin/ui/card";
import { Field, Input, Select, Textarea } from "@/components/admin/ui/form";
import { Button } from "@/components/admin/ui/button";
import { PAGE_TEMPLATES, PAGE_TEMPLATE_LABELS } from "@/lib/cms/sections";

export const slugify = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function NewPageForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [template, setTemplate] = useState("DEFAULT");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    start(async () => {
      const result = await createPageAction({ title, slug, template, description });
      if (result.ok) router.push(`/admin/pages/${result.id}/edit`);
      else {
        setErrors(result.fields ?? {});
        setMessage(result.message);
      }
    });
  };

  return (
    <form onSubmit={submit}>
      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        {message && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
        <Field label="Page title" htmlFor="title" required error={errors.title}>
          <Input id="title" value={title} maxLength={160} required onChange={(event) => { setTitle(event.target.value); if (!slugEdited) setSlug(slugify(event.target.value)); }} />
        </Field>
        <Field label="Page address" htmlFor="slug" required error={errors.slug} hint={`The page will live at /${slug || "your-address"}`}>
          <Input id="slug" value={slug} maxLength={80} required onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }} />
        </Field>
        <Field label="Layout" htmlFor="template">
          <Select id="template" value={template} onChange={(event) => setTemplate(event.target.value)}>
            {PAGE_TEMPLATES.map((value) => <option key={value} value={value}>{PAGE_TEMPLATE_LABELS[value]}</option>)}
          </Select>
        </Field>
        <Field label="Short description" htmlFor="description" hint="Used for search results and link previews. You can change it later." error={errors.description}>
          <Textarea id="description" rows={3} maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending || !title || !slug}>{pending ? "Creating…" : "Create and open builder"}</Button>
        </div>
      </Card>
    </form>
  );
}
