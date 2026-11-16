"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ALIGNS, BACKGROUNDS, BACKGROUND_LABELS, DEFAULT_STYLE, DEVICE_VISIBILITY, DEVICE_VISIBILITY_LABELS, PADDINGS, PAGE_TEMPLATES, PAGE_TEMPLATE_LABELS,
  PALETTE_TYPES, SECTION_LABELS, newSection,
  type AnySection, type PageContent, type SectionType, type SeoContent,
} from "@/lib/cms/sections";
import { discardDraftAction, publishPageAction, saveDraftAction, unpublishPageAction } from "../../actions";
import { MediaPickerModal } from "@/components/admin/media-picker";
import { Button, ButtonLink } from "@/components/admin/ui/button";
import { Card } from "@/components/admin/ui/card";
import { StatusBadge } from "@/components/admin/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/admin/ui/form";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";
import { COMPONENTS, COMPONENT_KEYS, componentAllowedOn, componentDefaults, type ComponentKey } from "@/lib/cms/components";
import { cn } from "@/lib/utils";

type Loaded = {
  id: string; status: string; isLive: boolean; hasDraft: boolean; liveSlug: string; publishAt: string | null; content: PageContent;
  /** Set for a built-in page (home, plans...): its address is fixed. */
  systemKey: string | null;
  /** Where the page lives on the site. */
  path: string;
};
type PickImage = (apply: (url: string, alt: string, size?: { width?: number; height?: number }) => void) => void;
type Errors = Record<string, string[]>;
type Rec = Record<string, unknown>;

const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : Math.random().toString(36).slice(2, 12));
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const DEVICES = { desktop: "100%", tablet: "820px", mobile: "390px" } as const;

function titleOf(section: AnySection) {
  if (section.type === "component") {
    const props = section.data.props as Rec;
    const text = (props.heading || props.title || (props.badge as string) || "") as string;
    return text ? text : COMPONENTS[section.data.component].label;
  }
  const data = section.data as Rec;
  const text = (data.heading || data.title || "") as string;
  return text || SECTION_LABELS[section.type].label;
}

export function PageBuilder({ page, canPublish, canDelete }: { page: Loaded; canPublish: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState<PageContent>(page.content);
  const [selected, setSelected] = useState<string | null>(page.content.sections[0]?.id ?? null);
  const [tab, setTab] = useState<"sections" | "settings">("sections");
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [scheduleAt, setScheduleAt] = useState("");
  const [picker, setPicker] = useState<((url: string, alt: string, size?: { width?: number; height?: number }) => void) | null>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = useCallback((update: (current: PageContent) => PageContent) => {
    setContent((current) => update(current));
    setDirty(true);
  }, []);

  const current = content.sections.find((section) => section.id === selected) ?? null;
  const patchSection = (id: string, patch: (section: AnySection) => AnySection) => change((c) => ({ ...c, sections: c.sections.map((s) => (s.id === id ? patch(s) : s)) }));
  const patchData = (id: string, patch: Rec) => patchSection(id, (s) => ({ ...s, data: { ...s.data, ...patch } }) as AnySection);
  const patchStyle = (id: string, patch: Rec) => patchSection(id, (s) => ({ ...s, style: { ...s.style, ...patch } }) as AnySection);
  const move = (from: number, to: number) =>
    change((c) => {
      if (to < 0 || to >= c.sections.length) return c;
      const sections = [...c.sections];
      const [item] = sections.splice(from, 1);
      sections.splice(to, 0, item);
      return { ...c, sections };
    });
  const addComponent = (key: ComponentKey) => {
    const section = { id: newId(), type: "component", visible: true, style: { ...DEFAULT_STYLE }, data: { component: key, props: componentDefaults(key, page.systemKey ?? undefined) } } as AnySection;
    change((c) => ({ ...c, sections: [...c.sections, section] }));
    setSelected(section.id);
    setTab("sections");
  };
  const add = (type: SectionType) => {
    const section = newSection(type, newId()) as AnySection;
    change((c) => ({ ...c, sections: [...c.sections, section] }));
    setSelected(section.id);
    setTab("sections");
  };
  const duplicate = (section: AnySection) => {
    const copy = { ...structuredClone(section), id: newId() } as AnySection;
    change((c) => {
      const index = c.sections.findIndex((s) => s.id === section.id);
      const sections = [...c.sections];
      sections.splice(index + 1, 0, copy);
      return { ...c, sections };
    });
    setSelected(copy.id);
  };
  const remove = (id: string) => {
    if (!window.confirm("Remove this section?")) return;
    change((c) => ({ ...c, sections: c.sections.filter((s) => s.id !== id) }));
    setSelected(null);
  };

  const run = (work: () => Promise<{ ok: boolean; message?: string; fields?: Errors }>, success: string, after?: () => void) =>
    start(async () => {
      setNotice(null);
      const result = await work();
      if (result.ok) {
        setErrors({});
        setNotice({ tone: "ok", text: success });
        after?.();
      } else {
        setErrors(result.fields ?? {});
        setNotice({ tone: "error", text: result.message ?? "Something went wrong." });
      }
    });

  const save = (then?: () => void) =>
    run(() => saveDraftAction(page.id, content), "Draft saved.", () => {
      setDirty(false);
      setPreviewKey((key) => key + 1);
      then?.();
    });
  const publish = () => {
    if (scheduleAt && !window.confirm(`Schedule this page to go live on ${new Date(scheduleAt).toLocaleString()}?`)) return;
    if (!scheduleAt && !window.confirm("Publish this page now? It becomes visible to everyone immediately.")) return;
    run(() => publishPageAction(page.id, content, scheduleAt ? new Date(scheduleAt).toISOString() : undefined), scheduleAt ? "Scheduled." : "Published.", () => {
      setDirty(false);
      setScheduleAt("");
      router.refresh();
    });
  };

  const errorFor = (path: string) => errors[path];
  const sectionErrors = useMemo(() => Object.entries(errors).filter(([key]) => key !== "form"), [errors]);

  const pickImage: PickImage = (apply) => setPicker(() => apply);
  const available = COMPONENT_KEYS.filter((key) => componentAllowedOn(key, page.systemKey ?? "") && !(COMPONENTS[key].single && content.sections.some((s) => s.type === "component" && s.data.component === key)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-navy-900">{content.title || "Untitled page"}</h1>
            <StatusBadge status={page.status} />
            {dirty && <span className="text-xs font-medium text-amber-700">Unsaved changes</span>}
            {!dirty && page.hasDraft && page.isLive && <span className="text-xs text-slate-500">Draft differs from the live page</span>}
          </div>
          <p className="text-xs text-slate-500">{page.path}{page.publishAt && page.status === "SCHEDULED" ? ` · goes live ${new Date(page.publishAt).toLocaleString()}` : ""}</p>
        </div>
        <ButtonLink href={`/admin/pages/${page.id}/versions`} variant="ghost" size="sm">History</ButtonLink>
        {(page.systemKey || page.isLive) && <ButtonLink href={page.path} variant="ghost" size="sm" target="_blank" rel="noopener">View live</ButtonLink>}
        <Button variant="secondary" size="sm" onClick={() => setShowPreview((v) => !v)}><EyeIcon />{showPreview ? "Hide preview" : "Show preview"}</Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => save(() => window.open(`/preview/${page.id}`, "_blank", "noopener"))}>Preview in new tab</Button>
        <Button variant="secondary" size="sm" disabled={pending || !dirty} onClick={() => save()}>{pending ? "Working…" : "Save draft"}</Button>
      </div>

      {notice && (
        <p role="status" className={cn("rounded-xl px-4 py-3 text-sm", notice.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{notice.text}</p>
      )}
      {sectionErrors.length > 0 && (
        <ul className="list-disc rounded-xl bg-red-50 px-8 py-3 text-sm text-red-700">
          {sectionErrors.slice(0, 8).map(([key, messages]) => <li key={key}>{labelFor(key, content)}: {messages[0]}</li>)}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: sections */}
        <Card className="flex flex-col gap-3 p-3 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
          <div className="flex rounded-xl bg-slate-100 p-1 text-sm">
            {(["sections", "settings"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setTab(value)} className={cn("flex-1 rounded-lg px-3 py-1.5 font-medium", tab === value ? "bg-white shadow-sm" : "text-slate-500")}>
                {value === "sections" ? "Sections" : "Page & SEO"}
              </button>
            ))}
          </div>

          <ol className="flex flex-col gap-1.5">
            {content.sections.map((section, index) => (
              <li
                key={section.id}
                draggable
                onDragStart={() => { dragId.current = section.id; }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  const from = content.sections.findIndex((s) => s.id === dragId.current);
                  if (from >= 0 && from !== index) move(from, index);
                  dragId.current = null;
                }}
                className={cn("rounded-xl border p-2", selected === section.id && tab === "sections" ? "border-primary-400 bg-primary-50/50" : "border-line", !section.visible && "opacity-60")}
              >
                <button type="button" className="w-full truncate text-left text-sm font-medium text-navy-900" onClick={() => { setSelected(section.id); setTab("sections"); }}>
                  {titleOf(section)}
                  <span className="block text-xs font-normal text-slate-500">{section.type === "component" ? COMPONENTS[section.data.component].label : SECTION_LABELS[section.type].label}{!section.visible ? " · hidden" : ""}</span>
                </button>
                <div className="mt-1.5 flex flex-wrap gap-1 text-xs">
                  <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, index - 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"><ArrowUpIcon /></button>
                  <button type="button" aria-label="Move down" disabled={index === content.sections.length - 1} onClick={() => move(index, index + 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30"><ArrowDownIcon /></button>
                  {!(section.type === "component" && COMPONENTS[section.data.component].single) && <button type="button" onClick={() => duplicate(section)} className="rounded px-1.5 hover:bg-slate-100">Duplicate</button>}
                  <button type="button" onClick={() => patchSection(section.id, (s) => ({ ...s, visible: !s.visible }) as AnySection)} className="rounded px-1.5 hover:bg-slate-100">{section.visible ? "Hide" : "Show"}</button>
                  <button type="button" aria-label="Remove section" onClick={() => remove(section.id)} className="ml-auto rounded p-1 text-red-600 hover:bg-red-50"><TrashIcon /></button>
                </div>
              </li>
            ))}
          </ol>
          {content.sections.length === 0 && <p className="px-1 text-sm text-slate-500">No sections yet. Add one below.</p>}

          <div>
            <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Add a section</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE_TYPES.map((type) => (
                <button key={type} type="button" title={SECTION_LABELS[type].hint} onClick={() => add(type)} className="flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-left text-xs font-medium hover:border-primary-300 hover:bg-primary-50/40">
                  <PlusIcon className="size-3" />{SECTION_LABELS[type].label}
                </button>
              ))}
            </div>
          </div>
          {available.length > 0 && (
            <div>
              <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Built-in components</p>
              <div className="grid grid-cols-1 gap-1.5">
                {available.map((key) => (
                  <button key={key} type="button" title={COMPONENTS[key].hint} onClick={() => addComponent(key)} className="flex items-center gap-1 rounded-lg border border-dashed border-line px-2 py-1.5 text-left text-xs font-medium hover:border-primary-300 hover:bg-primary-50/40">
                    <PlusIcon className="size-3" />{COMPONENTS[key].label}{COMPONENTS[key].functional && <span className="ml-auto text-[10px] font-normal text-slate-400">live data</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Right: properties and preview */}
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-4 sm:p-5">
            {tab === "settings" ? (
              <Settings content={content} errors={errors} liveSlug={page.liveSlug} isLive={page.isLive} systemPath={page.systemKey ? page.path : null} change={change} pickImage={pickImage} />
            ) : current ? (
              <SectionEditor key={current.id} section={current} systemKey={page.systemKey} errorFor={(path) => errorFor(`sections.${content.sections.findIndex((s) => s.id === current.id)}.${path}`)} patchData={(patch) => patchData(current.id, patch)} patchStyle={(patch) => patchStyle(current.id, patch)} pickImage={pickImage} />
            ) : (
              <p className="text-sm text-slate-500">Select a section to edit it, or add a new one.</p>
            )}
          </Card>

          {showPreview && (
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line p-2 text-sm">
                {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((key) => (
                  <button key={key} type="button" onClick={() => setDevice(key)} className={cn("rounded-lg px-3 py-1 capitalize", device === key ? "bg-primary-50 font-medium text-primary-700" : "text-slate-500")}>{key}</button>
                ))}
                <span className="ml-auto text-xs text-slate-500">{dirty ? "Save the draft to refresh the preview" : "Showing the saved draft"}</span>
              </div>
              <div className="flex justify-center bg-slate-100 p-3">
                <iframe key={previewKey} src={`/preview/${page.id}`} title="Page preview" style={{ width: DEVICES[device], maxWidth: "100%" }} className="h-[640px] rounded-lg border border-line bg-white" />
              </div>
            </Card>
          )}

          {(canPublish || canDelete) && (
            <Card className="flex flex-wrap items-end gap-3 p-4">
              {canPublish && (
                <>
                  <Field label="Schedule (optional)" htmlFor="schedule" hint="Leave empty to publish now.">
                    <Input id="schedule" type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} />
                  </Field>
                  <Button disabled={pending} onClick={publish}>{scheduleAt ? "Schedule" : page.isLive ? "Publish changes" : "Publish"}</Button>
                  {(page.systemKey ? page.isLive : page.status === "PUBLISHED" || page.status === "SCHEDULED") && (
                    <Button variant="warning-soft" disabled={pending} onClick={() => { if (window.confirm(page.status === "SCHEDULED" ? "Cancel the schedule?" : page.systemKey ? "Go back to the page's built-in layout? Your edited version is kept in the history." : "Take this page offline? Visitors will see a not-found page.")) run(() => unpublishPageAction(page.id), page.systemKey ? "Back to the built-in layout." : "Unpublished.", () => router.refresh()); }}>
                      {page.status === "SCHEDULED" ? "Cancel schedule" : page.systemKey ? "Revert to built-in layout" : "Unpublish"}
                    </Button>
                  )}
                </>
              )}
              {page.hasDraft && page.isLive && (
                <Button variant="ghost" disabled={pending} onClick={() => { if (window.confirm("Discard your draft and go back to the live page?")) run(() => discardDraftAction(page.id), "Draft discarded.", () => { setDirty(false); router.refresh(); window.location.reload(); }); }}>Discard draft</Button>
              )}
              {!canPublish && <p className="text-sm text-slate-500">You can save drafts. An administrator publishes them.</p>}
            </Card>
          )}
          <p className="text-xs text-slate-400">Need a different page?{" "}<Link href="/admin/pages" className="underline">Back to all pages</Link></p>
        </div>
      </div>

      {picker && (
        <MediaPickerModal
          folder="pages"
          onClose={() => setPicker(null)}
          onSelect={(media) => { picker(media.secureUrl, media.altText ?? "", { width: media.width, height: media.height }); setPicker(null); }}
        />
      )}
    </div>
  );
}

function labelFor(path: string, content: PageContent) {
  const match = /^sections\.(\d+)\./.exec(path);
  if (!match) return path.replace(/^seo\./, "SEO ");
  const section = content.sections[Number(match[1])];
  return section ? `${SECTION_LABELS[section.type].label} section` : "Section";
}

// ------------------------------------------------------------------ settings

function Settings({ content, errors, liveSlug, isLive, systemPath, change, pickImage }: {
  content: PageContent; errors: Errors; liveSlug: string; isLive: boolean; systemPath: string | null;
  change: (update: (c: PageContent) => PageContent) => void;
  pickImage: PickImage;
}) {
  const seo = content.seo;
  const setSeo = (patch: Partial<SeoContent>) => change((c) => ({ ...c, seo: { ...c.seo, ...patch } }));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Page title" htmlFor="p-title" required error={errors.title} className="sm:col-span-2">
        <Input id="p-title" value={content.title} maxLength={160} onChange={(e) => change((c) => ({ ...c, title: e.target.value }))} />
      </Field>
      {systemPath ? (
        <Field label="Page address" htmlFor="p-slug" hint="This page keeps its address, so existing links and search results keep working." className="sm:col-span-2">
          <Input id="p-slug" value={systemPath} readOnly disabled />
        </Field>
      ) : (
        <Field label="Page address" htmlFor="p-slug" error={errors.slug} hint={isLive && content.slug !== liveSlug ? `The old address /${liveSlug} will redirect here automatically.` : `Lives at /${content.slug}`} className="sm:col-span-2">
          <Input id="p-slug" value={content.slug} maxLength={80} onChange={(e) => change((c) => ({ ...c, slug: slugify(e.target.value) }))} />
        </Field>
      )}
      <Field label="Layout" htmlFor="p-template">
        <Select id="p-template" value={content.template} onChange={(e) => change((c) => ({ ...c, template: e.target.value as PageContent["template"] }))}>
          {PAGE_TEMPLATES.map((value) => <option key={value} value={value}>{PAGE_TEMPLATE_LABELS[value]}</option>)}
        </Select>
      </Field>
      <ImageField label="Featured image" url={content.featuredImage} onPick={() => pickImage((url) => change((c) => ({ ...c, featuredImage: url })))} onClear={() => change((c) => ({ ...c, featuredImage: "" }))} />
      <Field label="Short description" htmlFor="p-desc" className="sm:col-span-2" error={errors.description}>
        <Textarea id="p-desc" rows={2} maxLength={300} value={content.description} onChange={(e) => change((c) => ({ ...c, description: e.target.value }))} />
      </Field>

      <h3 className="mt-2 text-sm font-semibold text-navy-900 sm:col-span-2">Search engines &amp; sharing</h3>
      <Field label="SEO title" htmlFor="s-title" hint={`${seo.title.length}/70 · blank uses the page title`} error={errors["seo.title"]}>
        <Input id="s-title" value={seo.title} maxLength={120} onChange={(e) => setSeo({ title: e.target.value })} />
      </Field>
      <Field label="Canonical URL" htmlFor="s-canon" hint="Blank uses the page address" error={errors["seo.canonical"]}>
        <Input id="s-canon" value={seo.canonical} onChange={(e) => setSeo({ canonical: e.target.value })} />
      </Field>
      <Field label="Meta description" htmlFor="s-desc" hint={`${seo.description.length}/160`} className="sm:col-span-2" error={errors["seo.description"]}>
        <Textarea id="s-desc" rows={2} maxLength={300} value={seo.description} onChange={(e) => setSeo({ description: e.target.value })} />
      </Field>
      <Field label="Keywords" htmlFor="s-kw" hint="Comma separated" className="sm:col-span-2">
        <Input id="s-kw" value={seo.keywords.join(", ")} onChange={(e) => setSeo({ keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 20) })} />
      </Field>
      <Field label="Sharing title" htmlFor="s-ogt"><Input id="s-ogt" value={seo.ogTitle} onChange={(e) => setSeo({ ogTitle: e.target.value })} /></Field>
      <Field label="Sharing description" htmlFor="s-ogd"><Input id="s-ogd" value={seo.ogDescription} onChange={(e) => setSeo({ ogDescription: e.target.value })} /></Field>
      <ImageField label="Sharing image" url={seo.ogImage} onPick={() => pickImage((url) => setSeo({ ogImage: url }))} onClear={() => setSeo({ ogImage: "" })} />
      <div className="flex flex-col justify-end gap-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={seo.index} onChange={(e) => setSeo({ index: e.target.checked })} /> Let search engines index this page</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={seo.sitemap} onChange={(e) => setSeo({ sitemap: e.target.checked })} /> Include in the sitemap</label>
      </div>
    </div>
  );
}

function ImageField({ label, url, onPick, onClear }: { label: string; url: string; onPick: () => void; onClear: () => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      {url ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail */}
          <img src={url} alt="" className="size-16 rounded-lg border border-line object-cover" />
          <Button size="sm" variant="ghost" onClick={onPick}>Change</Button>
          <Button size="sm" variant="danger-soft" onClick={onClear}>Remove</Button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="self-start" onClick={onPick}>Choose from media library</Button>
      )}
    </div>
  );
}

// ------------------------------------------------------------ section editor

function SectionEditor({ section, systemKey, errorFor, patchData, patchStyle, pickImage }: {
  section: AnySection; systemKey: string | null; errorFor: (path: string) => string[] | undefined;
  patchData: (patch: Rec) => void; patchStyle: (patch: Rec) => void;
  pickImage: PickImage;
}) {
  const data = section.data as Rec;
  const err = (name: string) => errorFor(`data.${name}`);
  const text = (name: string, label: string, props: { long?: boolean; hint?: string } = {}) => (
    <Field label={label} htmlFor={`f-${name}`} hint={props.hint} error={err(name)} className={props.long ? "sm:col-span-2" : undefined}>
      {props.long ? (
        <Textarea id={`f-${name}`} rows={3} value={(data[name] as string) ?? ""} onChange={(e) => patchData({ [name]: e.target.value })} />
      ) : (
        <Input id={`f-${name}`} value={(data[name] as string) ?? ""} onChange={(e) => patchData({ [name]: e.target.value })} />
      )}
    </Field>
  );
  const image = (name: string, label: string) => {
    const value = (data[name] as { url: string; alt: string }) ?? { url: "", alt: "" };
    return (
      <div className="flex flex-col gap-2">
        <ImageField label={label} url={value.url} onPick={() => pickImage((url, alt) => patchData({ [name]: { url, alt: value.alt || alt } }))} onClear={() => patchData({ [name]: { url: "", alt: "" } })} />
        {value.url && <Input aria-label={`${label} description`} placeholder="Describe the image (for accessibility)" value={value.alt} onChange={(e) => patchData({ [name]: { ...value, alt: e.target.value } })} />}
      </div>
    );
  };
  const buttons = () => {
    const list = (data.buttons as { text: string; url: string }[]) ?? [];
    return (
      <div className="flex flex-col gap-2 sm:col-span-2">
        <span className="text-[13px] font-medium text-slate-700">Buttons</span>
        {list.map((button, index) => (
          <div key={index} className="flex gap-2">
            <Input aria-label="Button text" placeholder="Text" value={button.text} onChange={(e) => patchData({ buttons: list.map((b, i) => (i === index ? { ...b, text: e.target.value } : b)) })} />
            <Input aria-label="Button link" placeholder="/subscriptions or https://…" value={button.url} onChange={(e) => patchData({ buttons: list.map((b, i) => (i === index ? { ...b, url: e.target.value } : b)) })} />
            <Button size="sm" variant="danger-soft" aria-label="Remove button" onClick={() => patchData({ buttons: list.filter((_, i) => i !== index) })}><TrashIcon /></Button>
          </div>
        ))}
        {errorFor("data.buttons") && <p className="text-xs text-red-600">{errorFor("data.buttons")?.[0]}</p>}
        {list.length < 3 && <Button size="sm" variant="secondary" className="self-start" onClick={() => patchData({ buttons: [...list, { text: "", url: "" }] })}>Add button</Button>}
      </div>
    );
  };
  const items = (name: string, fields: { key: string; label: string; long?: boolean }[], blank: Rec, noun: string) => {
    const list = (data[name] as Rec[]) ?? [];
    return (
      <div className="flex flex-col gap-3 sm:col-span-2">
        {list.map((item, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-2">
            {fields.map((field) => (
              <Field key={field.key} label={field.label} htmlFor={`i-${name}-${index}-${field.key}`} className={field.long ? "sm:col-span-2" : undefined} error={errorFor(`data.${name}.${index}.${field.key}`)}>
                {field.long ? (
                  <Textarea id={`i-${name}-${index}-${field.key}`} rows={3} value={(item[field.key] as string) ?? ""} onChange={(e) => patchData({ [name]: list.map((x, i) => (i === index ? { ...x, [field.key]: e.target.value } : x)) })} />
                ) : (
                  <Input id={`i-${name}-${index}-${field.key}`} value={(item[field.key] as string) ?? ""} onChange={(e) => patchData({ [name]: list.map((x, i) => (i === index ? { ...x, [field.key]: e.target.value } : x)) })} />
                )}
              </Field>
            ))}
            <div className="sm:col-span-2"><Button size="sm" variant="danger-soft" onClick={() => patchData({ [name]: list.filter((_, i) => i !== index) })}>Remove {noun}</Button></div>
          </div>
        ))}
        <Button size="sm" variant="secondary" className="self-start" onClick={() => patchData({ [name]: [...list, structuredClone(blank)] })}>Add {noun}</Button>
      </div>
    );
  };

  let body: React.ReactNode = null;
  switch (section.type) {
    case "hero":
      body = <>{text("heading", "Heading")}{text("subheading", "Small label above")}{text("description", "Description", { long: true })}{image("image", "Image")}{buttons()}</>;
      break;
    case "richText":
      body = (
        <div className="sm:col-span-2 flex flex-col gap-3">
          {text("heading", "Heading (optional)")}
          <HtmlModeEditor value={data.html as string} onChange={(html) => patchData({ html })} />
          {err("html") && <p className="text-xs text-red-600">{err("html")?.[0]}</p>}
          <p className="text-xs text-slate-500">Scripts and unsafe markup are removed when the page is saved and published.</p>
        </div>
      );
      break;
    case "textImage":
      body = <>{text("heading", "Heading")}{text("subheading", "Subheading")}{text("text", "Text", { long: true })}{image("image", "Image")}{buttons()}</>;
      break;
    case "gallery": {
      const images = (data.images as { url: string; alt: string }[]) ?? [];
      body = (
        <>
          {text("heading", "Heading")}{text("description", "Description")}
          <div className="sm:col-span-2 flex flex-wrap gap-3">
            {images.map((item, index) => (
              <div key={index} className="flex w-32 flex-col gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-only thumbnail */}
                <img src={item.url} alt="" className="aspect-square rounded-lg border border-line object-cover" />
                <Input aria-label="Image description" placeholder="Describe" value={item.alt} onChange={(e) => patchData({ images: images.map((x, i) => (i === index ? { ...x, alt: e.target.value } : x)) })} />
                <Button size="sm" variant="danger-soft" onClick={() => patchData({ images: images.filter((_, i) => i !== index) })}>Remove</Button>
              </div>
            ))}
            <Button size="sm" variant="secondary" className="self-start" onClick={() => pickImage((url, alt) => patchData({ images: [...images, { url, alt }] }))}>Add image</Button>
          </div>
        </>
      );
      break;
    }
    case "video":
      body = <>{text("heading", "Heading")}{text("description", "Description")}{text("url", "Video link", { long: true, hint: "A YouTube or Vimeo link, or an uploaded .mp4 / .webm video." })}</>;
      break;
    case "features":
      body = <>{text("heading", "Heading")}{text("subheading", "Subheading")}{items("items", [{ key: "icon", label: "Icon (emoji)" }, { key: "title", label: "Title" }, { key: "text", label: "Text", long: true }], { icon: "✨", title: "", text: "" }, "card")}</>;
      break;
    case "stats":
      body = <>{text("heading", "Heading")}{items("items", [{ key: "value", label: "Number" }, { key: "label", label: "Label" }], { value: "", label: "" }, "statistic")}</>;
      break;
    case "faq":
      body = <>{text("heading", "Heading")}{items("items", [{ key: "question", label: "Question", long: true }, { key: "answer", label: "Answer", long: true }], { question: "", answer: "" }, "question")}</>;
      break;
    case "cta":
      body = <>{text("heading", "Heading")}{text("description", "Description", { long: true })}{buttons()}</>;
      break;
    case "contactInfo":
      body = <>{text("heading", "Heading")}{text("description", "Description")}{text("email", "Email")}{text("phone", "Phone")}{text("address", "Address", { long: true })}{text("hours", "Opening hours", { long: true })}</>;
      break;
    case "html":
      body = (
        <div className="sm:col-span-2">
          <Field label="Custom HTML" htmlFor="f-html" error={err("html")} hint="Basic HTML only. Scripts, event handlers and unapproved embeds are removed; videos may only come from YouTube or Vimeo.">
            <Textarea id="f-html" rows={12} className="font-mono text-xs" value={(data.html as string) ?? ""} onChange={(e) => patchData({ html: e.target.value })} />
          </Field>
        </div>
      );
      break;
    case "component": {
      const key = section.data.component;
      const meta = COMPONENTS[key];
      const template = componentDefaults(key, systemKey ?? undefined);
      body = (
        <div className="flex flex-col gap-4 sm:col-span-2">
          {meta.note && <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">{meta.note}</p>}
          {Object.keys(template).length > 0 && (
            <>
              <PropsEditor value={section.data.props} template={template} path="" pickImage={pickImage} onChange={(props) => patchData({ props })} errorFor={errorFor} />
              <Button size="sm" variant="ghost" className="self-start" onClick={() => { if (window.confirm("Put this section's content back to the built-in wording and pictures?")) patchData({ props: template }); }}>Reset to built-in content</Button>
            </>
          )}
        </div>
      );
      break;
    }
    case "spacer":
      body = (
        <>
          <Field label="Height" htmlFor="f-size">
            <Select id="f-size" value={data.size as string} onChange={(e) => patchData({ size: e.target.value })}>
              <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={Boolean(data.divider)} onChange={(e) => patchData({ divider: e.target.checked })} /> Show a divider line</label>
        </>
      );
      break;
  }

  const style = section.style;
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-base font-semibold text-navy-900">{section.type === "component" ? COMPONENTS[section.data.component].label : SECTION_LABELS[section.type].label}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{body}</div>

      <details className="rounded-xl border border-line p-3" open>
        <summary className="cursor-pointer text-sm font-medium">Layout &amp; appearance</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {section.type !== "component" && <>
          <Field label="Background" htmlFor="st-bg"><Select id="st-bg" value={style.background} onChange={(e) => patchStyle({ background: e.target.value })}>{BACKGROUNDS.map((v) => <option key={v} value={v}>{BACKGROUND_LABELS[v]}</option>)}</Select></Field>
          <Field label="Spacing" htmlFor="st-pad"><Select id="st-pad" value={style.padding} onChange={(e) => patchStyle({ padding: e.target.value })}>{PADDINGS.map((v) => <option key={v} value={v}>{{ none: "None", sm: "Small", md: "Medium", lg: "Large" }[v]}</option>)}</Select></Field>
          <Field label="Alignment" htmlFor="st-al"><Select id="st-al" value={style.align} onChange={(e) => patchStyle({ align: e.target.value })}>{ALIGNS.map((v) => <option key={v} value={v}>{v === "left" ? "Left" : "Centre"}</option>)}</Select></Field>
          </>}
          <Field label="Show on" htmlFor="st-dev"><Select id="st-dev" value={style.devices} onChange={(e) => patchStyle({ devices: e.target.value })}>{DEVICE_VISIBILITY.map((v) => <option key={v} value={v}>{DEVICE_VISIBILITY_LABELS[v]}</option>)}</Select></Field>
          {(section.type === "gallery" || section.type === "features") && (
            <Field label="Columns" htmlFor="st-col"><Select id="st-col" value={style.columns} onChange={(e) => patchStyle({ columns: Number(e.target.value) })}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></Select></Field>
          )}
          {section.type === "textImage" && (
            <>
              <Field label="Image position" htmlFor="st-side"><Select id="st-side" value={style.imageSide} onChange={(e) => patchStyle({ imageSide: e.target.value })}><option value="right">Right</option><option value="left">Left</option></Select></Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={style.mobileImageFirst} onChange={(e) => patchStyle({ mobileImageFirst: e.target.checked })} /> Image first on phones</label>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

function RichEditorField({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  return (
    <div className="rounded-xl border border-line p-2">
      <RichTextEditor name="html" initialContent={value} placeholder="Write your content…" onChange={onChange} />
    </div>
  );
}

// ------------------------------------------------- HTML source / visual toggle

/** One stored value, two ways to edit it: the visual editor, or the HTML itself. Both write the same field. */
function HtmlModeEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex self-start rounded-xl bg-slate-100 p-1 text-sm">
        {(["visual", "html"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={cn("rounded-lg px-3 py-1 font-medium", mode === m ? "bg-white shadow-sm" : "text-slate-500")}>{m === "visual" ? "Visual editor" : "HTML"}</button>
        ))}
      </div>
      {mode === "visual" ? (
        <RichEditorField value={value} onChange={onChange} />
      ) : (
        <Textarea aria-label="HTML source" rows={14} className="font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

// ------------------------------------------------- built-in component content

const humanise = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace(/\bHref\b/, "Link");

/** An object shaped like a picture: the editor swaps it through the media library. */
const isImage = (template: unknown): template is { src: string; width: number; height: number; alt?: string } =>
  Boolean(template) && typeof template === "object" && !Array.isArray(template) && "src" in (template as Rec) && "width" in (template as Rec) && "height" in (template as Rec);

/** A new list item shaped like the built-in one, with its text cleared. */
function blankLike(template: unknown): unknown {
  if (typeof template === "string") return "";
  if (typeof template === "number") return 0;
  if (typeof template === "boolean") return false;
  if (Array.isArray(template)) return template.length ? [blankLike(template[0])] : [];
  if (template && typeof template === "object") return Object.fromEntries(Object.entries(template).map(([k, v]) => [k, k === "src" || k === "width" || k === "height" ? v : blankLike(v)]));
  return template;
}

/**
 * Edits any built-in component's content by walking its built-in shape: text
 * boxes for text, a picture chooser for pictures, repeatable cards for lists.
 * One editor covers every component, so none needs its own form, and a new
 * built-in section can be added without touching the editor.
 */
function PropsEditor({ value, template, path, label, pickImage, onChange, errorFor }: {
  value: unknown; template: unknown; path: string; label?: string; pickImage: PickImage;
  onChange: (next: unknown) => void; errorFor: (path: string) => string[] | undefined;
}) {
  const name = label ?? "";
  const error = errorFor(`data.props${path ? "." + path : ""}`)?.[0];
  const id = `pe-${path || "root"}`.replace(/[^a-zA-Z0-9-]/g, "-");

  if (typeof template === "string") {
    const text = typeof value === "string" ? value : "";
    const long = name === "body" || text.length > 90 || text.includes("\n") || template.length > 90;
    const isLink = name === "href" || name === "url";
    return (
      <Field label={humanise(name)} htmlFor={id} error={error} hint={isLink ? "A page on this site (like /subscriptions), an https:// address, or mailto: / tel:" : name === "body" ? "Use ## for a heading, ### for a sub-heading, - for list items, and a blank line between paragraphs." : undefined}>
        {long ? <Textarea id={id} rows={name === "body" ? 22 : 4} value={text} onChange={(e) => onChange(e.target.value)} /> : <Input id={id} value={text} onChange={(e) => onChange(e.target.value)} />}
      </Field>
    );
  }
  if (typeof template === "number") {
    return <Field label={humanise(name)} htmlFor={id}><Input id={id} type="number" value={typeof value === "number" ? value : 0} onChange={(e) => onChange(Number(e.target.value))} /></Field>;
  }
  if (typeof template === "boolean") {
    return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> {humanise(name)}</label>;
  }
  if (Array.isArray(template)) {
    const list = Array.isArray(value) ? value : [];
    const patch = (next: unknown[]) => onChange(next);
    return (
      <div className="flex flex-col gap-3">
        {name && <p className="text-[13px] font-semibold text-slate-700">{humanise(name)}</p>}
        {list.map((item, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-xl border border-line p-3">
            <PropsEditor value={item} template={template[0]} path={`${path}.${index}`.replace(/^\./, "")} label={typeof template[0] === "object" ? undefined : "Text"} pickImage={pickImage} errorFor={errorFor} onChange={(next) => patch(list.map((x, i) => (i === index ? next : x)))} />
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => { const next = [...list]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; patch(next); }}><ArrowUpIcon /></Button>
              <Button size="sm" variant="ghost" disabled={index === list.length - 1} onClick={() => { const next = [...list]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; patch(next); }}><ArrowDownIcon /></Button>
              <Button size="sm" variant="danger-soft" onClick={() => patch(list.filter((_, i) => i !== index))}>Remove</Button>
            </div>
          </div>
        ))}
        {list.length < 100 && <Button size="sm" variant="secondary" className="self-start" onClick={() => patch([...list, blankLike(template[0])])}>Add {name ? humanise(name).toLowerCase().replace(/s$/, "") : "item"}</Button>}
      </div>
    );
  }
  if (isImage(template)) {
    const image = (value && typeof value === "object" ? value : template) as Rec;
    const src = typeof image.src === "string" ? image.src : template.src;
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
        <ImageField label={humanise(name) || "Image"} url={src} onPick={() => pickImage((url, alt, size) => onChange({ ...image, src: url, alt: (image.alt as string) || alt, width: size?.width ?? image.width, height: size?.height ?? image.height }))} onClear={() => onChange({ ...template })} />
        {"alt" in template && <Input aria-label="Image description" placeholder="Describe the image (for accessibility)" value={(image.alt as string) ?? ""} onChange={(e) => onChange({ ...image, alt: e.target.value })} />}
        <p className="text-xs text-slate-500">Removing resets to the built-in picture.</p>
      </div>
    );
  }
  if (template && typeof template === "object") {
    const source = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Rec;
    return (
      <div className={cn("flex flex-col gap-3", name && "rounded-xl border border-line p-3")}>
        {name && <p className="text-[13px] font-semibold text-slate-700">{humanise(name)}</p>}
        {Object.entries(template).map(([key, inner]) => (
          <PropsEditor key={key} value={source[key]} template={inner} path={path ? `${path}.${key}` : key} label={key} pickImage={pickImage} errorFor={errorFor} onChange={(next) => onChange({ ...source, [key]: next })} />
        ))}
      </div>
    );
  }
  return null;
}
