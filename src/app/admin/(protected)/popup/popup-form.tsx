"use client";

import { useActionState, useState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import { Card } from "@/components/admin/ui/card";
import { Alert } from "@/components/admin/ui/feedback";
import { buttonClasses } from "@/components/admin/ui/button";
import { Field, FormSection, Input, Select, Textarea } from "@/components/admin/ui/form";
import { PromoPopupCard } from "@/components/promo/PromoPopupCard";
import { PROMO_FREQUENCIES, type PromoImage } from "@/lib/promo-popup";
import type { MediaItem } from "@/types/media";
import type { PromoPopupAdmin } from "@/services/promo-popup.service";
import { savePopupAction, type PopupState } from "./actions";

/** An ISO instant as the "YYYY-MM-DDTHH:mm" a datetime-local box wants, in Indian time. */
const toIst = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 16) : "");

const asImage = (item: MediaItem | null, alt: string): PromoImage | null => (item ? { src: item.secureUrl, width: item.width ?? 1200, height: item.height ?? 800, alt: item.altText || alt } : null);
const fromInitial = (image: PromoPopupAdmin["desktopImage"]): MediaItem | null =>
  image ? ({ _id: image.id, secureUrl: image.src, width: image.width, height: image.height, altText: image.alt, filename: "", publicId: "", resourceType: "image", bytes: 0, folder: "popup", createdAt: "" } as MediaItem) : null;

export function PopupForm({ initial, canEdit }: { initial: PromoPopupAdmin; canEdit: boolean }) {
  const [state, action, pending] = useActionState<PopupState, FormData>(savePopupAction, undefined);
  const [desktop, setDesktop] = useState<MediaItem | null>(fromInitial(initial.desktopImage));
  const [mobile, setMobile] = useState<MediaItem | null>(fromInitial(initial.mobileImage));
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [ctaLabel, setCtaLabel] = useState(initial.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(initial.ctaUrl);
  const [backgroundColor, setBackgroundColor] = useState(initial.backgroundColor);
  const [overlay, setOverlay] = useState(initial.overlayOpacity);
  const [view, setView] = useState<"desktop" | "mobile">("desktop");

  const desktopImage = asImage(desktop, title || "Promotion");
  const mobileImage = asImage(mobile, title || "Promotion");
  // The live popup lets either image stand in for the other; the preview does too.
  const preview = {
    desktopImage: desktopImage ?? mobileImage,
    mobileImage: mobileImage ?? desktopImage,
    title, description, ctaLabel, ctaUrl, backgroundColor,
  };
  const hasContent = Boolean(preview.desktopImage || title || description);

  return (
    <form action={action} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
      <Card className="p-0">
        <fieldset disabled={!canEdit || pending} className="contents">
          <FormSection title="Status" description="Switch the popup on or off without losing its settings.">
            <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
              <input type="checkbox" name="enabled" defaultChecked={initial.enabled} className="size-4" /> Popup is active
            </label>
          </FormSection>

          <FormSection title="Banner images" description="Upload a wide image for desktop and a taller one for phones. If you only add one, it is used on both.">
            <div className="grid gap-5 sm:grid-cols-2">
              <MediaPicker name="desktopImage" label="Desktop banner (about 1600×900)" initial={fromInitial(initial.desktopImage)} folder="popup" onChange={setDesktop} />
              <MediaPicker name="mobileImage" label="Mobile banner (about 900×1100)" initial={fromInitial(initial.mobileImage)} folder="popup" onChange={setMobile} />
            </div>
          </FormSection>

          <FormSection title="Content" description="All optional. Leave the text empty for an image-only banner.">
            <Field label="Title" htmlFor="title">
              <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Description" htmlFor="description">
              <Textarea id="description" name="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Button text" htmlFor="ctaLabel">
                <Input id="ctaLabel" name="ctaLabel" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={40} placeholder="Register now" />
              </Field>
              <Field label="Button link" htmlFor="ctaUrl" hint="A page on this site (/pilot) or a full address. With no button text, the image itself becomes the link.">
                <Input id="ctaUrl" name="ctaUrl" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} maxLength={300} placeholder="/pilot" />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Background colour" htmlFor="backgroundColor">
                <input id="backgroundColor" name="backgroundColor" type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-line bg-white p-1" />
              </Field>
              <Field label={`Overlay darkness: ${overlay}%`} htmlFor="overlayOpacity">
                <input id="overlayOpacity" name="overlayOpacity" type="range" min={0} max={90} step={5} value={overlay} onChange={(e) => setOverlay(Number(e.target.value))} className="h-10 w-full" />
              </Field>
            </div>
          </FormSection>

          <FormSection title="When it appears" description="Dates are in Indian time (IST).">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Delay (seconds)" htmlFor="delaySeconds" hint="After the page has finished loading.">
                <Input id="delaySeconds" name="delaySeconds" type="number" min={0} max={60} step={1} defaultValue={initial.delaySeconds} />
              </Field>
              <Field label="Frequency" htmlFor="frequency">
                <Select id="frequency" name="frequency" defaultValue={initial.frequency}>
                  {PROMO_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
              </Field>
              <Field label="Start" htmlFor="startsAt" hint="Leave empty to start now.">
                <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toIst(initial.startsAt)} />
              </Field>
              <Field label="Expiry" htmlFor="endsAt" hint="Leave empty to run until switched off.">
                <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toIst(initial.endsAt)} />
              </Field>
            </div>
            <label className="flex items-start gap-2.5 text-sm text-slate-700">
              <input type="checkbox" name="relaunch" className="mt-0.5 size-4" />
              <span>Show again to visitors who already closed it. <span className="text-slate-500">Tick this for a new campaign; leave it off for small corrections.</span></span>
            </label>
          </FormSection>
        </fieldset>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-4 sm:px-6">
            <button type="submit" disabled={pending} className={buttonClasses({ variant: "primary" })}>{pending ? "Saving…" : "Save popup"}</button>
            <div aria-live="polite">
              {state?.error && <Alert tone="error">{state.error}</Alert>}
              {state?.success && <p className="text-sm font-medium text-emerald-700">Saved. The website is updated.</p>}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6 xl:sticky xl:top-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Preview</h2>
          <div role="tablist" aria-label="Preview size" className="inline-flex rounded-xl bg-slate-100/80 p-1">
            {(["desktop", "mobile"] as const).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{v}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-200 p-4">
          <div className="mx-auto flex items-center justify-center py-6" style={{ width: view === "desktop" ? 880 : 390, maxWidth: "none", backgroundColor: `rgba(0,0,0,${overlay / 100})`, paddingInline: view === "desktop" ? 0 : 16 }}>
            {hasContent ? (
              <div className="w-full" style={{ width: view === "desktop" ? 880 : 358 }}>
                <PromoPopupCard config={preview} inert onClose={() => {}} />
              </div>
            ) : (
              <p className="px-6 py-16 text-center text-sm text-white/80">Add an image or some text to see the preview.</p>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Desktop is shown at 880px wide, phone at 390px. Phones get the phone layout and banner automatically.</p>
      </Card>
    </form>
  );
}
