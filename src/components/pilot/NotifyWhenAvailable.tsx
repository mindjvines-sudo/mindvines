"use client";

import { useState, type FormEvent } from "react";
import { normalisePhone, phoneProblem } from "@/lib/countries";

const field = "h-12 w-full rounded-xl border border-field-line bg-paper px-4 text-[17px] text-ink";
export const NOTIFY_BUTTON = "inline-flex h-12 items-center justify-center rounded-full border border-r-[3px] border-b-[3px] border-cocoa bg-amber px-6 text-[16px] font-bold text-ink hover:bg-[#f5b21c] disabled:opacity-60";

/** The "not in your neighbourhood yet" message with an optional lead form, shared by the pilot search popup and the registration form. */
export function NotifyWhenAvailable({ pincode, titleId, onDone }: { pincode: string; titleId?: string; onDone?: () => void }) {
  const [form, setForm] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const email = form.email.trim();
    const phone = form.phone.trim() ? normalisePhone("IN", form.phone) : "";
    const found: { email?: string; phone?: string } = {};
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) found.email = "Enter a valid email address";
    if (phone) found.phone = phoneProblem("IN", phone) ?? undefined;
    if (!email && !phone) found.email = "Add an email address or mobile number so we can reach you";
    setFieldErrors(found);
    if (found.email || found.phone) return;
    setError(""); setBusy(true);
    try {
      const res = await fetch("/api/locations/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, phone, email, pincode }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "We couldn't save your details. Please try again."); return; }
      setSent(true);
    } catch {
      setError("We couldn't save your details. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <>
        <h2 id={titleId} className="font-display text-[26px] font-semibold leading-tight">Thank you!</h2>
        <p className="mt-3 text-[17px] leading-relaxed">We&apos;ve noted {pincode} and will get in touch as soon as we start in your area.</p>
        {onDone && <button type="button" onClick={onDone} className={`${NOTIFY_BUTTON} mt-6`}>Close</button>}
      </>
    );
  }

  return (
    <>
      <h2 id={titleId} className="font-display text-[26px] font-semibold leading-tight">Not in your neighbourhood yet.</h2>
      <p className="mt-3 text-[17px] leading-relaxed">We&apos;re expanding to new neighbourhoods across India. Leave your details and we&apos;ll let you know as soon as we start in your area.</p>
      {!form ? (
        <button type="button" onClick={() => setForm({ name: "", email: "", phone: "" })} className={`${NOTIFY_BUTTON} mt-6`}>Notify me when available</button>
      ) : (
        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-3">
          <label className="text-[15px] font-bold">Name <span className="font-normal">(optional)</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" maxLength={80} className={`${field} mt-1`} />
          </label>
          <label className="text-[15px] font-bold">Email address
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" maxLength={120} aria-invalid={fieldErrors.email ? true : undefined} className={`${field} mt-1`} />
            {fieldErrors.email && <span role="alert" className="mt-1 block text-[14px] font-bold text-red-800">{fieldErrors.email}</span>}
          </label>
          <label className="text-[15px] font-bold">Mobile number <span className="font-normal">(optional)</span>
            <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="off" maxLength={15} placeholder="10-digit mobile number" aria-invalid={fieldErrors.phone ? true : undefined} className={`${field} mt-1`} />
            {fieldErrors.phone && <span role="alert" className="mt-1 block text-[14px] font-bold text-red-800">{fieldErrors.phone}</span>}
          </label>
          <label className="text-[15px] font-bold">PIN code
            <input value={pincode} readOnly className={`${field} mt-1 bg-stone`} />
          </label>
          {error && <p role="alert" className="text-[15px] font-bold text-red-800">{error}</p>}
          <button type="submit" disabled={busy} className={NOTIFY_BUTTON}>{busy ? "Submitting…" : "Submit"}</button>
        </form>
      )}
    </>
  );
}
