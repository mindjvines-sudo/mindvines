"use client";

import { useRef, useState, type FormEvent } from "react";
import { NOTIFY_BUTTON, NotifyWhenAvailable } from "@/components/pilot/NotifyWhenAvailable";

type Result =
  | { kind: "yes"; pincode: string; city: string; state: string }
  | { kind: "no"; pincode: string };

const field = "h-12 w-full rounded-xl border border-field-line bg-paper px-4 text-[17px] text-ink";

/** "Is Mindvines available at my pincode?" The answer opens in a popup; for an area we don't serve yet, the parent can leave details to be told when we arrive. */
export function AvailabilityCheck() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function check(event: FormEvent) {
    event.preventDefault();
    const code = pincode.replace(/\s+/g, "");
    if (!/^[1-9]\d{5}$/.test(code)) { setError("Enter a valid 6-digit PIN code."); return; }
    setError(""); setBusy(true);
    try {
      const res = await fetch("/api/locations/availability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pincode: code }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "We couldn't check this pincode. Please try again."); return; }
      setResult(data.serviceable ? { kind: "yes", pincode: code, city: data.city, state: data.state } : { kind: "no", pincode: code });
      dialog.current?.showModal();
    } catch {
      setError("We couldn't check this pincode. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const button = NOTIFY_BUTTON;

  return (
    <div className="mt-12 max-w-[520px]">
      <form onSubmit={check} noValidate>
        <label htmlFor="availability-pincode" className="text-[16px] font-bold">Is Mindvines available in your area?</label>
        <p className="mt-1 text-[15px]">Enter your PIN code to find out.</p>
        <div className="mt-2 flex gap-3">
          <input id="availability-pincode" inputMode="numeric" autoComplete="postal-code" maxLength={7} placeholder="6-digit PIN code" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/[^\d\s]/g, ""))} aria-invalid={error ? true : undefined} aria-describedby={error ? "availability-error" : undefined} className={field} />
          <button type="submit" disabled={busy} className="inline-flex h-12 shrink-0 items-center rounded-full border border-ink/30 px-6 text-[16px] font-bold text-ink hover:bg-stone disabled:opacity-60">{busy && !result ? "Checking…" : "Check"}</button>
        </div>
        {error && <p id="availability-error" role="alert" className="mt-2 text-[15px] font-bold text-red-800">{error}</p>}
      </form>

      <dialog ref={dialog} aria-labelledby="availability-title" onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }} className="m-auto w-[min(92vw,460px)] rounded-[28px] bg-card p-0 text-ink shadow-card backdrop:bg-black/50">
        <div className="p-6 sm:p-8">
          {result?.kind === "yes" && (
            <>
              <h2 id="availability-title" className="font-display text-[26px] font-semibold leading-tight">Good news, we&apos;re in your area!</h2>
              <p className="mt-3 text-[17px] leading-relaxed">Mindvines is available at {result.pincode} ({result.city}, {result.state}). Pick a pilot plan above to register your child.</p>
              <button type="button" onClick={() => dialog.current?.close()} className={`${button} mt-6`}>See pilot plans</button>
            </>
          )}
          {result?.kind === "no" && <NotifyWhenAvailable key={result.pincode} pincode={result.pincode} titleId="availability-title" onDone={() => dialog.current?.close()} />}
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Close" className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-[22px] leading-none hover:bg-stone">×</button>
        </div>
      </dialog>
    </div>
  );
}
