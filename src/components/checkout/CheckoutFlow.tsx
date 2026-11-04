"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatPaise } from "@/lib/subscription-status";
import { cn } from "@/lib/utils";
import { checkoutDetailsSchema, type CheckoutDetails } from "@/validations/checkout.schema";

type Plan = {
  id: string;
  name: string;
  description: string;
  ageGroup: string;
  durationMonths: number;
  journalCount: number;
  features: string[];
};
type Amounts = { baseAmount: number; taxAmount: number; totalAmount: number };
type Step = "review" | "details" | "pay";
type Outcome = null | "paid" | "pending" | "failed" | "cancelled";

type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const EMPTY: CheckoutDetails = { name: "", email: "", phone: "", childName: "", childAge: "" };
const FIELDS: { key: keyof CheckoutDetails; label: string; type: string; autoComplete?: string; inputMode?: "numeric" | "tel" | "email" }[] = [
  { key: "name", label: "Parent or guardian's name", type: "text", autoComplete: "name" },
  { key: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email" },
  { key: "phone", label: "Mobile number", type: "tel", autoComplete: "tel", inputMode: "tel" },
  { key: "childName", label: "Child's name", type: "text" },
  { key: "childAge", label: "Child's age (years)", type: "text", inputMode: "numeric" },
];

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function post(path: string, body: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: response.ok, status: response.status, data: (await response.json().catch(() => ({}))) as Record<string, unknown> };
}

/** `plansHref` leads back to the plan band this plan was chosen from. */
export function CheckoutFlow({ plan, amounts, gstPercent, plansHref }: { plan: Plan; amounts: Amounts; gstPercent: number; plansHref: string }) {
  const storageKey = `mv-checkout-${plan.id}`;
  const [step, setStep] = useState<Step>("review");
  // Read on the client only. The form isn't in the first render, so hydration is unaffected.
  const [details, setDetails] = useState<CheckoutDetails>(() => {
    if (typeof window === "undefined") return EMPTY;
    try {
      return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(storageKey) ?? "{}") };
    } catch {
      return EMPTY;
    }
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutDetails, string>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const orderRef = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // What was typed survives a reload or a failed payment.
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(details));
    } catch {}
  }, [details, storageKey]);
  useEffect(() => headingRef.current?.focus(), [step, outcome]);

  // A payment still being confirmed is checked again until the server has settled it.
  useEffect(() => {
    if (outcome !== "pending" || !orderRef.current) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const response = await fetch(`/api/checkout/status?order=${orderRef.current}`, { cache: "no-store" }).catch(() => null);
      const status = response?.ok ? ((await response.json()) as { status?: string }).status : undefined;
      if (status === "PAID") setOutcome("paid");
      else if (status === "FAILED" || tries >= 30) {
        setOutcome(status === "FAILED" ? "failed" : "pending");
        if (status === "FAILED") setMessage("The payment did not go through.");
      }
      if (status === "PAID" || status === "FAILED" || tries >= 30) clearInterval(timer);
    }, 4000);
    return () => clearInterval(timer);
  }, [outcome]);

  const finish = useCallback((next: Outcome, text = "") => {
    setBusy(false);
    setMessage(text);
    setOutcome(next);
    if (next === "paid") {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {}
    }
  }, [storageKey]);

  function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    const parsed = checkoutDetailsSchema.safeParse(details);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, list]) => [key, list?.[0]])));
      return;
    }
    setErrors({});
    setDetails(parsed.data);
    setStep("pay");
  }

  async function pay() {
    setBusy(true);
    setMessage("");
    const order = await post("/api/checkout/order", { planId: plan.id, ...details }).catch(() => null);
    if (!order?.ok) {
      const fields = order?.data.fields as Partial<Record<keyof CheckoutDetails, string[]>> | undefined;
      if (fields) {
        setErrors(Object.fromEntries(Object.entries(fields).map(([key, list]) => [key, list?.[0]])));
        setStep("details");
      }
      setBusy(false);
      setMessage(String(order?.data.error ?? "We couldn't start the payment. Please try again."));
      return;
    }
    const { orderId, keyId, amount, currency } = order.data as { orderId: string; keyId: string; amount: number; currency: string };
    orderRef.current = orderId;

    if (!(await loadRazorpay()) || !window.Razorpay) {
      setBusy(false);
      setMessage("The payment window couldn't load. Check your connection and try again.");
      return;
    }

    const checkout = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount,
      currency,
      name: "Mindvines",
      description: plan.name,
      prefill: { name: details.name, email: details.email, contact: details.phone },
      theme: { color: "#f0a500" },
      handler: async (response: RazorpaySuccess) => {
        setBusy(true);
        const verified = await post("/api/checkout/verify", response).catch(() => null);
        const status = verified?.data.status;
        if (status === "paid") finish("paid");
        else if (status === "pending" || !verified) finish("pending");
        else finish("failed", String(verified.data.error ?? "We couldn't confirm this payment."));
      },
      modal: {
        ondismiss: () => {
          void post("/api/checkout/outcome", { orderId, outcome: "cancelled" }).catch(() => null);
          setBusy(false);
          setOutcome((current) => current ?? "cancelled");
        },
      },
    });
    checkout.on("payment.failed", (response) => {
      const reason = response.error?.description ?? "The payment failed.";
      void post("/api/checkout/outcome", { orderId, outcome: "failed", reason }).catch(() => null);
      finish("failed", reason);
    });
    setOutcome(null);
    checkout.open();
  }

  const duration = `${plan.durationMonths} ${plan.durationMonths === 1 ? "month" : "months"}`;
  const summary = (
    <aside className="rounded-[28px] bg-card p-6 shadow-card lg:p-8" aria-label="Your plan">
      <p className="text-[15px] font-bold text-tan">Ages {plan.ageGroup}</p>
      <h2 className="mt-1 font-display text-[28px] font-semibold leading-tight text-ink">{plan.name}</h2>
      <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{plan.description}</p>
      <ul className="mt-5 space-y-2 text-[16px]">
        <li className="font-bold">{duration}</li>
        <li className="font-bold">{plan.journalCount} {plan.journalCount === 1 ? "journal" : "journals"} included</li>
        {plan.features.map((feature, index) => (
          <li key={index} className="flex gap-3"><span aria-hidden className="font-bold">✓</span><span>{feature}</span></li>
        ))}
      </ul>
      <dl className="mt-6 space-y-2 border-t border-ink/15 pt-5 text-[16px]">
        <div className="flex justify-between"><dt>Plan price</dt><dd className="tabular-nums">{formatPaise(amounts.baseAmount)}</dd></div>
        <div className="flex justify-between"><dt>GST ({gstPercent}%)</dt><dd className="tabular-nums">{formatPaise(amounts.taxAmount)}</dd></div>
        <div className="flex justify-between border-t border-ink/15 pt-3 text-[20px] font-bold"><dt>Total</dt><dd className="tabular-nums">{formatPaise(amounts.totalAmount)}</dd></div>
      </dl>
    </aside>
  );

  const heading = "font-display text-[30px] font-semibold leading-tight text-ink outline-none lg:text-[38px]";
  const primary = "inline-flex h-[48px] items-center justify-center rounded-full border border-r-[3px] border-b-[3px] border-cocoa bg-amber px-8 text-[18px] font-bold text-ink transition-colors hover:bg-[#f5b21c] disabled:cursor-not-allowed disabled:opacity-60";
  const secondary = "inline-flex h-[48px] items-center justify-center rounded-full border border-ink/30 px-7 text-[17px] font-bold text-ink hover:bg-stone";

  let panel: React.ReactNode;
  if (outcome === "paid") {
    panel = (
      <div role="status">
        <h1 ref={headingRef} tabIndex={-1} className={heading}>Payment received. Welcome to Mindvines!</h1>
        <p className="mt-4 text-[18px] leading-relaxed">
          Your subscription is active. We&apos;ll write to <strong>{details.email}</strong> with what happens next. Keep this email handy for any questions.
        </p>
        <div className="mt-8"><Link href="/" className={primary}>Back to home</Link></div>
      </div>
    );
  } else if (outcome === "pending") {
    panel = (
      <div role="status" aria-live="polite">
        <h1 ref={headingRef} tabIndex={-1} className={heading}>We&apos;re confirming your payment</h1>
        <p className="mt-4 text-[18px] leading-relaxed">
          This can take a minute. Please don&apos;t pay again. This page updates by itself, and if money was taken your subscription will activate as soon as the bank confirms it. Questions? Write to us from the <Link href="/#contact" className="font-bold underline underline-offset-4">contact form</Link>.
        </p>
      </div>
    );
  } else if (outcome === "failed" || outcome === "cancelled") {
    panel = (
      <div role="alert">
        <h1 ref={headingRef} tabIndex={-1} className={heading}>{outcome === "failed" ? "The payment didn't go through" : "Payment cancelled"}</h1>
        <p className="mt-4 text-[18px] leading-relaxed">
          {outcome === "failed" ? message || "Nothing has been charged for this attempt." : "You closed the payment window. Nothing was charged."} Your details are saved, so you can try again.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => { setOutcome(null); setMessage(""); void pay(); }} className={primary}>Try again</button>
          <button type="button" onClick={() => { setOutcome(null); setStep("details"); }} className={secondary}>Edit my details</button>
        </div>
      </div>
    );
  } else if (step === "review") {
    panel = (
      <div>
        <p className="text-[15px] font-bold text-tan">Step 1 of 3</p>
        <h1 ref={headingRef} tabIndex={-1} className={heading}>Review your plan</h1>
        <p className="mt-4 text-[18px] leading-relaxed">Check the plan and what you&apos;ll pay, GST included, then add your details.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => setStep("details")} className={primary}>Continue</button>
          <Link href={plansHref} className={secondary}>Choose another plan</Link>
        </div>
      </div>
    );
  } else if (step === "details") {
    panel = (
      <form onSubmit={submitDetails} noValidate>
        <p className="text-[15px] font-bold text-tan">Step 2 of 3</p>
        <h1 ref={headingRef} tabIndex={-1} className={heading}>Your details</h1>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className={cn(field.key === "name" || field.key === "email" ? "sm:col-span-2" : undefined)}>
              <label htmlFor={`f-${field.key}`} className="block text-[16px] font-bold">{field.label}</label>
              <input
                id={`f-${field.key}`}
                name={field.key}
                type={field.type}
                inputMode={field.inputMode}
                autoComplete={field.autoComplete}
                value={details[field.key]}
                onChange={(event) => setDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                aria-invalid={errors[field.key] ? true : undefined}
                aria-describedby={errors[field.key] ? `e-${field.key}` : undefined}
                className="mt-1 h-12 w-full rounded-xl border border-field-line bg-paper px-4 text-[17px] text-ink"
              />
              {errors[field.key] && <p id={`e-${field.key}`} className="mt-1 text-[14px] font-bold text-red-700">{errors[field.key]}</p>}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="submit" className={primary}>Continue to payment</button>
          <button type="button" onClick={() => setStep("review")} className={secondary}>Back</button>
        </div>
      </form>
    );
  } else {
    panel = (
      <div>
        <p className="text-[15px] font-bold text-tan">Step 3 of 3</p>
        <h1 ref={headingRef} tabIndex={-1} className={heading}>Pay securely</h1>
        <dl className="mt-6 space-y-3 text-[17px]">
          {([["Name", details.name], ["Email", details.email], ["Mobile", details.phone], ["Child", `${details.childName}, ${details.childAge}`]] as const).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6"><dt className="font-bold">{label}</dt><dd className="break-all text-right">{value}</dd></div>
          ))}
        </dl>
        {message && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[16px] font-bold text-red-800">{message}</p>}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={pay} disabled={busy} className={primary}>
            {busy ? "Please wait…" : `Pay ${formatPaise(amounts.totalAmount)}`}
          </button>
          <button type="button" onClick={() => setStep("details")} disabled={busy} className={secondary}>Edit details</button>
        </div>
        <p className="mt-4 text-[14px] text-ink/70">Payments are processed by Razorpay. We never see your card or UPI details.</p>
      </div>
    );
  }

  return (
    <section className="bg-cream">
      <div className="mx-auto grid max-w-[1100px] gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14 lg:py-[72px]">
        <div className="rounded-[28px] bg-paper p-6 shadow-card lg:p-10">{panel}</div>
        {summary}
      </div>
    </section>
  );
}
