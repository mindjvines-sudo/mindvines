"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PlanTabs, type PlanOption } from "@/components/age-group/PlanTabs";
import { DEFAULT_FOOTNOTE, DEFAULT_PRICE_NOTE } from "@/lib/plan-options";
import { renewalPeriod } from "@/lib/renewal";
import { formatPaise } from "@/lib/subscription-status";
import { checkTopicPicks } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { TopicPicker, type PreferenceCategory } from "./TopicPicker";
import { postJson, useRazorpayCheckout, type RazorpayOrder } from "./useRazorpayCheckout";
import { RegistrationRecovery } from "./RegistrationRecovery";

type Step = "find" | "choose" | "review";
type Errors = Record<string, string | undefined>;

/** What the server sends back once the registration is found (see services/renewal.service). */
export type RenewalLookupOptions = {
  token: string;
  registrationId: string;
  reference: string;
  childName: string;
  age: number | null;
  nickname: string;
  recommendedAgeGroup: string | null;
  current: {
    planId: string;
    planName: string;
    programme: string;
    ageGroup: string;
    durationMonths: number;
    state: string;
    startDate: string | null;
    expiryDate: string | null;
  } | null;
  runningUntil: string | null;
  /** Renewals already paid for that haven't started yet, in start order. */
  upcoming: { planName: string; programme: string; durationMonths: number; startDate: string; expiryDate: string }[];
  gstPercent: number;
  plans: {
    id: string;
    name: string;
    ageGroup: string;
    durationMonths: number;
    journalCount: number;
    badge: string;
    featured: boolean;
    buttonLabel: string;
    programmeId: string;
    amounts: { baseAmount: number; taxAmount: number; totalAmount: number };
  }[];
  programmes: { id: string; name: string; ageGroup: string; categories: PreferenceCategory[] }[];
  chosenCategoryIds: string[];
};

const INPUT = "mt-1 h-12 w-full rounded-xl border border-field-line bg-paper px-4 text-[17px] text-ink";
const HEADING = "font-display text-[30px] font-semibold leading-tight text-ink outline-none lg:text-[38px]";
const PRIMARY = "inline-flex h-[48px] items-center justify-center rounded-full border border-r-[3px] border-b-[3px] border-cocoa bg-amber px-8 text-[18px] font-bold text-ink transition-colors hover:bg-[#f5b21c] disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY = "inline-flex h-[48px] items-center justify-center rounded-full border border-ink/30 px-7 text-[17px] font-bold text-ink hover:bg-stone disabled:opacity-60";

const topicsKey = (categoryId: string) => `topics.${categoryId}`;
const durationLabel = (months: number) => (months === 1 ? "Monthly" : `${months} months`);
/** "Writing only · 3 months", without repeating a plan name that only restates either part. */
function planLabel(programme: string, planName: string, months: number) {
  const parts = [programme, durationLabel(months)];
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  if (planName && !parts.some((part) => same(part, planName)) && !same(planName, `${months} months`)) parts.push(planName);
  return parts.filter(Boolean).join(" · ");
}
const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const STATE_TEXT: Record<string, string> = {
  ACTIVE: "Active",
  UPCOMING: "Starts soon",
  EXPIRING_SOON: "Expiring soon",
  EXPIRING_TODAY: "Expires today",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
  PENDING_PAYMENT: "Payment pending",
};

/**
 * Renewing a child's subscription with their registration number. The parent
 * proves the registration is theirs with the email or mobile number they
 * registered with, picks any plan (and, for a new programme, its topics), and
 * pays. A renewal paid before the current subscription ends starts when it
 * ends, so no days are lost. The server verifies the payment before anything
 * changes.
 */
export function RenewalFlow({ initialReference }: { initialReference: string }) {
  const [step, setStep] = useState<Step>("find");
  const [reference, setReference] = useState(initialReference);
  const [contact, setContact] = useState("");
  const [options, setOptions] = useState<RenewalLookupOptions | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [viewAge, setViewAge] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [errors, setErrors] = useState<Errors>({});
  const { outcome, setOutcome, message, setMessage, busy, setBusy, open } = useRazorpayCheckout();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus(), [step, outcome, recovering]);

  const plan = options?.plans.find((item) => item.id === planId) ?? null;
  const programme = plan ? options?.programmes.find((item) => item.id === plan.programmeId) ?? null : null;
  // Lists in the chosen programme the child hasn't picked from before.
  const newCategories = useMemo(
    () => (programme && options ? programme.categories.filter((category) => !options.chosenCategoryIds.includes(category.id)) : []),
    [programme, options]
  );
  const period = plan ? renewalPeriod(options?.runningUntil ? new Date(options.runningUntil) : null, plan.durationMonths) : null;

  // The age group the child is in today comes first.
  const ageGroups = useMemo(() => {
    if (!options) return [];
    const groups = [...new Set(options.plans.map((item) => item.ageGroup))];
    return groups.sort((a, b) => Number(b === options.recommendedAgeGroup) - Number(a === options.recommendedAgeGroup));
  }, [options]);

  // The age group on show: the one picked, else the chosen plan's, else the child's own.
  const shownAge = viewAge ?? plan?.ageGroup ?? ageGroups[0] ?? "";
  // That age group's plans as the subscription page's duration tabs, one card per plan.
  const planTabs: PlanOption[] = (() => {
    if (!options) return [];
    const byDuration = new Map<number, RenewalLookupOptions["plans"]>();
    for (const item of options.plans.filter((entry) => entry.ageGroup === shownAge)) {
      byDuration.set(item.durationMonths, [...(byDuration.get(item.durationMonths) ?? []), item]);
    }
    return [...byDuration.entries()].sort(([a], [b]) => a - b).map(([months, group]) => ({
      tab: durationLabel(months),
      cards: group.map((item) => ({
        title: item.name,
        price: formatPaise(item.amounts.baseAmount),
        period: months === 1 ? "month" : months === 3 ? "quarter" : months === 12 ? "year" : `${months} months`,
        badge: item.badge,
        highlight: item.featured,
        buttonLabel: item.buttonLabel || "Select plan",
        buttonHref: "",
        select: {
          selected: item.id === planId,
          current: item.id === options.current?.planId,
          onSelect: () => { setPlanId(item.id); setErrors({}); setMessage(""); },
        },
      })),
    }));
  })();

  async function find(event: React.FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (reference.trim().length < 3) found.reference = "Enter your registration number";
    if (contact.trim().length < 3) found.contact = "Enter the email or mobile number you registered with";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setMessage("");
    setBusy(true);
    const response = await postJson("/api/renewals/lookup", { reference, contact }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setMessage(String(response?.data.error ?? "We couldn't look up your registration. Check your connection and try again."));
      return;
    }
    const data = response.data as RenewalLookupOptions;
    setOptions(data);
    setReference(data.reference);
    // Start from the plan they have now, if it's still offered.
    setPlanId(data.current && data.plans.some((item) => item.id === data.current!.planId) ? data.current.planId : null);
    setSelections({});
    setStep("choose");
  }

  function choose(event: React.FormEvent) {
    event.preventDefault();
    if (!plan) {
      setMessage("Choose a plan to renew with.");
      return;
    }
    const found: Errors = {};
    for (const category of newCategories) {
      const problem = checkTopicPicks(selections[category.id] ?? [], category.topics.map((topic) => topic.id), category.required);
      if (problem) found[topicsKey(category.id)] = problem;
    }
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-topics] input:not(:disabled)")?.focus());
      return;
    }
    setMessage("");
    setStep("review");
  }

  async function pay() {
    if (!options || !plan) return;
    setBusy(true);
    setMessage("");
    const order = await postJson("/api/renewals/order", {
      registrationId: options.registrationId,
      token: options.token,
      planId: plan.id,
      selections: Object.fromEntries(newCategories.map((category) => [category.id, selections[category.id] ?? []])),
    }).catch(() => null);
    if (!order?.ok) {
      setBusy(false);
      if (order?.data.code === "ACCESS_EXPIRED") {
        setOptions(null);
        setStep("find");
      } else if (order?.data.fields) {
        setErrors(Object.fromEntries(Object.entries(order.data.fields as Record<string, string[]>).map(([key, list]) => [key, list[0]])));
        setStep("choose");
      }
      setMessage(String(order?.data.error ?? "We couldn't start the payment. Please try again."));
      return;
    }
    await open(order.data as RazorpayOrder, {
      description: `Renewal · ${programme?.name ?? ""} · ${plan.name}`,
      prefill: { name: "", email: contact.includes("@") ? contact.trim() : "", contact: contact.includes("@") ? "" : contact.trim() },
      notes: { reference: options.reference },
    });
  }

  const alert = message && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[16px] font-bold text-red-800">{message}</p>;

  let panel: React.ReactNode;
  if (outcome === "paid" && options && plan && period) {
    panel = (
      <div role="status">
        <h1 ref={headingRef} tabIndex={-1} className={HEADING}>Renewal complete. Thank you!</h1>
        <p className="mt-4 text-[18px] leading-relaxed">
          {options.childName}&apos;s subscription ({planLabel(programme?.name ?? "", plan.name, plan.durationMonths)}) {options.runningUntil ? "is queued and will run from" : "now runs from"} <strong>{formatDate(period.start)}</strong> to{" "}
          <strong>{formatDate(period.end)}</strong>. Registration number <strong>{options.reference}</strong> stays the same.
        </p>
        <div className="mt-8"><Link href="/" className={PRIMARY}>Back to home</Link></div>
      </div>
    );
  } else if (outcome === "pending") {
    panel = (
      <div role="status" aria-live="polite">
        <h1 ref={headingRef} tabIndex={-1} className={HEADING}>We&apos;re confirming your payment</h1>
        <p className="mt-4 text-[18px] leading-relaxed">
          This can take a minute. Please don&apos;t pay again. This page updates by itself, and the renewal goes through as soon as the bank confirms it.
        </p>
      </div>
    );
  } else if (outcome === "failed" || outcome === "cancelled") {
    panel = (
      <div role="alert">
        <h1 ref={headingRef} tabIndex={-1} className={HEADING}>{outcome === "failed" ? "The payment didn't go through" : "Payment cancelled"}</h1>
        <p className="mt-4 text-[18px] leading-relaxed">
          {outcome === "failed" ? message || "Nothing has been charged for this attempt." : "You closed the payment window. Nothing was charged."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => { setOutcome(null); setMessage(""); void pay(); }} className={PRIMARY}>Try again</button>
          <button type="button" onClick={() => { setOutcome(null); setMessage(""); setStep("choose"); }} className={SECONDARY}>Choose another plan</button>
        </div>
      </div>
    );
  } else if ((step === "find" || !options) && recovering) {
    panel = <RegistrationRecovery
      initialEmail={contact.includes("@") ? contact : ""}
      onCancel={() => { setRecovering(false); setMessage(""); }}
      onRecovered={(data, email) => {
        setOptions(data);
        setReference(data.reference);
        setContact(email);
        setPlanId(data.current && data.plans.some((item) => item.id === data.current!.planId) ? data.current.planId : null);
        setViewAge(null);
        setSelections({});
        setErrors({});
        setMessage("");
        setRecovering(false);
        setStep("choose");
      }}
    />;
  } else if (step === "find" || !options) {
    panel = (
      <form onSubmit={find} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className={HEADING}>Renew a subscription</h1>
        <p className="mt-3 text-[17px] leading-relaxed">
          Enter the registration number from your confirmation (it looks like <strong>MV-7K3Q9P</strong>) and the email or mobile number you registered with.
        </p>
        <p className="mt-2 text-[17px] leading-relaxed">
          On the next step you can keep the same plan or choose a different one: another duration, the other age group, or another programme.
        </p>
        <div className="mt-6 grid gap-5">
          <div>
            <label htmlFor="r-reference" className="block text-[16px] font-bold">Registration number<span aria-hidden className="text-red-700">*</span></label>
            <input
              id="r-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="MV-7K3Q9P"
              aria-invalid={errors.reference ? true : undefined}
              className={INPUT}
            />
            {errors.reference && <p className="mt-1 text-[14px] font-bold text-red-700">{errors.reference}</p>}
          </div>
          <div>
            <label htmlFor="r-contact" className="block text-[16px] font-bold">Email or mobile number<span aria-hidden className="text-red-700">*</span></label>
            <input
              id="r-contact"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              autoComplete="email"
              aria-invalid={errors.contact ? true : undefined}
              className={INPUT}
            />
            {errors.contact && <p className="mt-1 text-[14px] font-bold text-red-700">{errors.contact}</p>}
          </div>
        </div>
        {alert}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={busy} className={PRIMARY}>{busy ? "Looking up…" : "Find my registration"}</button>
          <Link href="/subscriptions" className="text-[16px] font-bold underline underline-offset-4">New to Mindvines? See the plans</Link>
        </div>
        <button type="button" disabled={busy} onClick={() => { setRecovering(true); setMessage(""); }} className="mt-5 text-[16px] font-bold underline underline-offset-4">Forgot registration number?</button>
      </form>
    );
  } else if (step === "choose") {
    const current = options.current;
    panel = (
      <form onSubmit={choose} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className={HEADING}>Renew for {options.childName}</h1>
        <div className="mt-4 rounded-2xl border border-field-line p-5 text-[16px]">
          <p className="text-[14px] font-bold uppercase tracking-[0.06em] text-tan">Registration {options.reference}</p>
          {current ? (
            <p className="mt-2 leading-relaxed">
              Now on <strong>{planLabel(current.programme, current.planName, current.durationMonths)}</strong> (ages {current.ageGroup}).{" "}
              {STATE_TEXT[current.state] ?? current.state}
              {current.expiryDate && (current.state === "EXPIRED" || current.state === "CANCELLED" ? ` since ${formatDate(current.expiryDate)}.` : ` until ${formatDate(current.expiryDate)}.`)}
            </p>
          ) : (
            <p className="mt-2">No subscription yet.</p>
          )}
          {options.upcoming.length > 0 && (
            <div className="mt-3">
              <p className="font-bold">Already queued</p>
              <ul className="mt-1 list-disc pl-5">
                {options.upcoming.map((item, index) => (
                  <li key={index}>
                    {planLabel(item.programme, item.planName, item.durationMonths)}: {formatDate(item.startDate)} to {formatDate(item.expiryDate)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {options.runningUntil && (
            <p className="mt-2 text-ink/70">
              {options.upcoming.length > 0
                ? `A plan you choose now is queued after the last one, starting ${formatDate(options.runningUntil)}.`
                : "The plan you choose is queued: it starts when the current subscription ends, so no days are lost."}
            </p>
          )}
        </div>

        <h2 className="mt-8 text-[20px] font-bold">Choose a plan</h2>
        {ageGroups.length > 1 && (
          <div role="group" aria-label="Choose an age group" className="mt-4 flex flex-wrap gap-3">
            {ageGroups.map((ageGroup) => (
              <button
                key={ageGroup}
                type="button"
                onClick={() => setViewAge(ageGroup)}
                aria-pressed={ageGroup === shownAge}
                className={cn("rounded-full border px-6 py-3 font-bold transition-colors", ageGroup === shownAge ? "border-ink bg-ink text-paper" : "border-ink/20 hover:bg-stone")}
              >
                Ages {ageGroup}
              </button>
            ))}
          </div>
        )}
        {shownAge === options.recommendedAgeGroup && options.age !== null && (
          <p className="mt-3 text-[15px] font-bold">Right for {options.childName}, {options.age} years</p>
        )}
        <div className="-mx-5 mt-5 rounded-3xl bg-tan px-5 py-8 sm:mx-0 sm:px-8">
          {planTabs.length > 0 ? (
            <PlanTabs key={shownAge} label={`Ages ${shownAge} plans`} plans={planTabs} priceNote={DEFAULT_PRICE_NOTE} footnote={DEFAULT_FOOTNOTE} compact />
          ) : (
            <p role="status" className="text-[17px]">No renewal plans are available right now. Please check back later or contact us.</p>
          )}
        </div>
        {errors.plan && <p role="alert" className="mt-3 text-[15px] font-bold text-red-700">{errors.plan}</p>}

        {newCategories.length > 0 && (
          <div className="mt-8 rounded-2xl bg-cream p-5">
            <p className="text-[16px] font-bold">This programme has new topic lists. Pick {options.childName}&apos;s favourites from them.</p>
            {newCategories.map((category) => (
              <TopicPicker
                key={category.id}
                category={category}
                fieldKey={topicsKey(category.id)}
                picked={selections[category.id] ?? []}
                onToggle={(topicId) =>
                  setSelections((currentSelections) => {
                    const picks = currentSelections[category.id] ?? [];
                    return { ...currentSelections, [category.id]: picks.includes(topicId) ? picks.filter((id) => id !== topicId) : [...picks, topicId] };
                  })
                }
                error={errors[topicsKey(category.id)]}
              />
            ))}
          </div>
        )}

        {alert}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="submit" disabled={options.plans.length === 0} className={PRIMARY}>Continue</button>
          <button type="button" onClick={() => { setStep("find"); setMessage(""); }} className={SECONDARY}>Previous</button>
        </div>
      </form>
    );
  } else if (plan && period) {
    panel = (
      <div>
        <h1 ref={headingRef} tabIndex={-1} className={HEADING}>Review and pay</h1>
        <dl className="mt-6 space-y-2 rounded-2xl border border-field-line p-5 text-[16px]">
          {(
            [
              ["Child", options.childName],
              ["Registration", options.reference],
              ["Plan", `Ages ${plan.ageGroup} · ${planLabel(programme?.name ?? "", plan.name, plan.durationMonths)}`],
              ["Starts", options.runningUntil ? `${formatDate(period.start)}, after your current plan${options.upcoming.length > 0 ? " and the queued one" + (options.upcoming.length > 1 ? "s" : "") : ""} ends` : `${formatDate(period.start)} (today)`],
              ["Ends", formatDate(period.end)],
              ["Price", formatPaise(plan.amounts.baseAmount)],
              [`GST (${options.gstPercent}%)`, formatPaise(plan.amounts.taxAmount)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6">
              <dt className="shrink-0 text-ink/70">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-6 border-t border-ink/15 pt-2 text-[19px] font-bold">
            <dt>Total payable</dt>
            <dd className="tabular-nums">{formatPaise(plan.amounts.totalAmount)}</dd>
          </div>
        </dl>
        {alert}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={pay} disabled={busy} className={PRIMARY}>{busy ? "Please wait…" : `Pay now ${formatPaise(plan.amounts.totalAmount)}`}</button>
          <button type="button" onClick={() => setStep("choose")} disabled={busy} className={SECONDARY}>Previous</button>
        </div>
        <p className="mt-4 text-[14px] text-ink/70">Payments are processed by Razorpay. The renewal is confirmed once the payment is verified.</p>
      </div>
    );
  }

  return (
    <section className="bg-cream">
      <div className={cn("mx-auto px-5 py-10 sm:px-8 lg:py-[64px]", step === "choose" && options ? "max-w-[1240px]" : "max-w-[760px]")}>
        <div className="rounded-[28px] bg-paper p-6 shadow-card lg:p-10">{panel}</div>
      </div>
    </section>
  );
}
