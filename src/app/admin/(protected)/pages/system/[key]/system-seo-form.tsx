"use client";

import { useState, useTransition } from "react";
import { saveSystemSeoAction } from "../../actions";
import type { SeoContent } from "@/lib/cms/sections";
import { Card } from "@/components/admin/ui/card";
import { Field, Input, Textarea } from "@/components/admin/ui/form";
import { Button } from "@/components/admin/ui/button";

export function SystemSeoForm({ pageKey, initial, canEdit }: { pageKey: string; initial: SeoContent; canEdit: boolean }) {
  const [seo, setSeo] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<SeoContent>) => setSeo((value) => ({ ...value, ...patch }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveSystemSeoAction(pageKey, seo);
          setErrors(result.ok ? {} : result.fields ?? {});
          setNotice({ ok: result.ok, text: result.ok ? "Saved. The page now uses these details." : result.message });
        });
      }}
    >
      <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        {notice && <p role="status" className={`rounded-xl px-4 py-3 text-sm sm:col-span-2 ${notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{notice.text}</p>}
        <Field label="SEO title" htmlFor="t" error={errors["seo.title"]}><Input id="t" disabled={!canEdit} value={seo.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Canonical URL" htmlFor="c" error={errors["seo.canonical"]}><Input id="c" disabled={!canEdit} value={seo.canonical} onChange={(e) => set({ canonical: e.target.value })} /></Field>
        <Field label="Meta description" htmlFor="d" className="sm:col-span-2" error={errors["seo.description"]} hint={`${seo.description.length}/160`}>
          <Textarea id="d" rows={2} disabled={!canEdit} maxLength={300} value={seo.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Keywords" htmlFor="k" hint="Comma separated" className="sm:col-span-2">
          <Input id="k" disabled={!canEdit} value={seo.keywords.join(", ")} onChange={(e) => set({ keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 20) })} />
        </Field>
        <Field label="Sharing title" htmlFor="ot"><Input id="ot" disabled={!canEdit} value={seo.ogTitle} onChange={(e) => set({ ogTitle: e.target.value })} /></Field>
        <Field label="Sharing description" htmlFor="od"><Input id="od" disabled={!canEdit} value={seo.ogDescription} onChange={(e) => set({ ogDescription: e.target.value })} /></Field>
        <Field label="Sharing image URL" htmlFor="oi" className="sm:col-span-2" error={errors["seo.ogImage"]} hint="A Cloudinary image or a path on this site"><Input id="oi" disabled={!canEdit} value={seo.ogImage} onChange={(e) => set({ ogImage: e.target.value })} /></Field>
        <div className="flex flex-col gap-2 text-sm sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={seo.index} onChange={(e) => set({ index: e.target.checked })} /> Let search engines index this page</label>
          <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={seo.sitemap} onChange={(e) => set({ sitemap: e.target.checked })} /> Include in the sitemap</label>
        </div>
        {canEdit && <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save SEO"}</Button></div>}
      </Card>
    </form>
  );
}
