"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { DEFAULT_COUNTRY, countriesByName, findCountry } from "@/lib/countries";
import { formatPaise } from "@/lib/subscription-status";
import { checkTopicPicks } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { ageInYears, registrationDetailsSchema, registrationPreferencesSchema } from "@/validations/registration.schema";
import { TopicPicker, type PreferenceCategory } from "./TopicPicker";
import { postJson as post, useRazorpayCheckout, type RazorpayOrder } from "./useRazorpayCheckout";

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
type Step = "details" | "preferences" | "payment";
type Errors = Record<string, string | undefined>;


type Details = {
  childName: string;
  childDob: string;
  school: string;
  parentName: string;
  countryCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  phoneCountry: string;
  phone: string;
  email: string;
  acceptTerms: boolean;
  allowFeature: boolean;
  whatsappUpdates: boolean;
};

/** Everything typed so far, kept in this browser tab, with the saved draft's id and secret token. */
type Saved = {
  details: Details;
  nickname: string;
  selections: Record<string, string[]>;
  registrationId?: string;
  token?: string;
  reference?: string;
};

const EMPTY_DETAILS: Details = {
  childName: "",
  childDob: "",
  school: "",
  parentName: "",
  countryCode: DEFAULT_COUNTRY,
  addressLine1: "",
  addressLine2: "",
  city: "",
  postalCode: "",
  phoneCountry: DEFAULT_COUNTRY,
  phone: "",
  email: "",
  acceptTerms: false,
  allowFeature: false,
  whatsappUpdates: false,
};
const EMPTY: Saved = { details: EMPTY_DETAILS, nickname: "", selections: {} };

/** Shared by every plan, so switching programme keeps what was typed. */
const STORAGE_KEY = "mv-registration";

const STEPS: { id: Step; label: string }[] = [
  { id: "details", label: "Your Details" },
  { id: "preferences", label: "Your Preferences" },
  { id: "payment", label: "Payment" },
];

/** Form order, so a failed submit lands on the first field with a problem. */
const DETAIL_ORDER: (keyof Details)[] = [
  "childName", "childDob", "school", "parentName", "countryCode", "addressLine1", "addressLine2", "city", "postalCode",
  "phoneCountry", "phone", "email", "acceptTerms",
];

const INPUT = "mt-1 w-full rounded-xl border border-field-line bg-paper px-4 text-[17px] text-ink";

const topicsKey = (categoryId: string) => `topics.${categoryId}`;

function firstErrors(fields: Record<string, string[] | undefined>): Errors {
  return Object.fromEntries(Object.entries(fields).map(([key, list]) => [key, list?.[0]]));
}

function focusFirstError(found: Errors, order: string[]) {
  const key = order.find((field) => found[field]);
  if (!key) return;
  requestAnimationFrame(() => {
    const target = document.getElementById(`f-${key}`) ?? document.querySelector<HTMLElement>(`[data-topics="${key}"] input:not(:disabled)`);
    target?.focus();
    target?.scrollIntoView({ block: "center" });
  });
}

const subscribeNothing = () => () => {};

/**
 * Registering for a plan in three pages: 01 the child, parent, address and
 * permissions (saved as a draft on the server); 02 the child's nickname and
 * favourite topics from their programme's lists (saved on the draft); 03 the
 * order summary and payment. The subscription is only activated once the
 * server has verified the payment. Going back never loses what was typed.
 */
export function CheckoutFlow({
  plan,
  programmeName,
  programmeChoices,
  categories,
  amounts,
  gstPercent,
  plansHref,
  legal,
}: {
  plan: Plan;
  programmeName: string;
  programmeChoices: { programmeId: string; name: string; planId: string }[];
  categories: PreferenceCategory[];
  amounts: Amounts;
  gstPercent: number;
  plansHref: string;
  legal: { terms: string; privacy: string };
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  // Saved answers are read in the browser only; the form waits for hydration so the first render matches the server's.
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [saved, setSaved] = useState<Saved>(() => {
    if (typeof window === "undefined") return EMPTY;
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<Saved>;
      const offered = new Map(categories.map((category) => [category.id, new Set(category.topics.map((topic) => topic.id))]));
      return {
        ...EMPTY,
        ...stored,
        details: { ...EMPTY_DETAILS, ...stored.details },
        // Picks this programme doesn't offer are dropped.
        selections: Object.fromEntries(
          Object.entries(stored.selections ?? {}).flatMap(([id, picks]) =>
            offered.has(id) ? [[id, picks.filter((pick) => offered.get(id)!.has(pick))]] : []
          )
        ),
      };
    } catch {
      return EMPTY;
    }
  });
  const [errors, setErrors] = useState<Errors>({});
  // Once paid, what was typed is no longer kept in the browser.
  const { outcome, setOutcome, message, setMessage, busy, setBusy, open } = useRazorpayCheckout(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const countries = useMemo(() => (hydrated ? countriesByName() : []), [hydrated]);

  const { details } = saved;

  // What was typed survives going back, a reload or a failed payment.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {}
  }, [saved]);
  useEffect(() => headingRef.current?.focus(), [step, outcome]);

  const setDetail = <K extends keyof Details>(key: K, value: Details[K]) =>
    setSaved((current) => ({ ...current, details: { ...current.details, [key]: value } }));

  function toggleTopic(categoryId: string, topicId: string) {
    setSaved((current) => {
      const picks = current.selections[categoryId] ?? [];
      const next = picks.includes(topicId) ? picks.filter((id) => id !== topicId) : [...picks, topicId];
      return { ...current, selections: { ...current.selections, [categoryId]: next } };
    });
  }

  function goTo(next: Step) {
    setErrors({});
    setMessage("");
    setStep(next);
  }

  /** A draft the server no longer knows (finished, or cleared away) means starting the form again from page 1. */
  function startOver(text: string) {
    setSaved((current) => ({ ...current, registrationId: undefined, token: undefined, reference: undefined }));
    setMessage(text);
    setStep("details");
  }

  async function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    const parsed = registrationDetailsSchema.safeParse(details);
    if (!parsed.success) {
      const found = firstErrors(parsed.error.flatten().fieldErrors);
      setErrors(found);
      focusFirstError(found, DETAIL_ORDER);
      return;
    }
    setErrors({});
    setMessage("");
    setBusy(true);
    const response = await post("/api/registrations", {
      registrationId: saved.registrationId,
      token: saved.token,
      planId: plan.id,
      details,
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      const fields = response?.data.fields as Record<string, string[]> | undefined;
      if (fields) {
        const found = firstErrors(fields);
        setErrors(found);
        focusFirstError(found, DETAIL_ORDER);
      }
      setMessage(String(response?.data.error ?? "We couldn't save your details. Check your connection and try again."));
      return;
    }
    const { registrationId, token, reference } = response.data as { registrationId: string; token: string; reference: string };
    setSaved((current) => ({ ...current, registrationId, token, reference }));
    goTo("preferences");
  }

  async function submitPreferences(event: React.FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    const nickname = registrationPreferencesSchema.shape.nickname.safeParse(saved.nickname);
    if (!nickname.success) found.nickname = nickname.error.issues[0]?.message;
    for (const category of categories) {
      const problem = checkTopicPicks(saved.selections[category.id] ?? [], category.topics.map((topic) => topic.id), category.required);
      if (problem) found[topicsKey(category.id)] = problem;
    }
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      focusFirstError(found, ["nickname", ...categories.map((category) => topicsKey(category.id))]);
      return;
    }
    if (!saved.registrationId || !saved.token) {
      startOver("Please check your details again before choosing topics.");
      return;
    }
    setErrors({});
    setMessage("");
    setBusy(true);
    const response = await post("/api/registrations/preferences", {
      registrationId: saved.registrationId,
      token: saved.token,
      preferences: { nickname: saved.nickname, selections: Object.fromEntries(categories.map((category) => [category.id, saved.selections[category.id] ?? []])) },
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      if (response?.data.code === "NOT_FOUND") return startOver("Your saved registration has expired. Please check your details again.");
      const fields = response?.data.fields as Record<string, string[]> | undefined;
      if (fields) setErrors(firstErrors(fields));
      setMessage(String(response?.data.error ?? "We couldn't save your choices. Check your connection and try again."));
      return;
    }
    goTo("payment");
  }

  async function pay() {
    if (!saved.registrationId || !saved.token) return startOver("Please check your details again before paying.");
    setBusy(true);
    setMessage("");
    const order = await post("/api/checkout/order", { registrationId: saved.registrationId, token: saved.token }).catch(() => null);
    if (!order?.ok) {
      setBusy(false);
      if (order?.data.code === "NOT_FOUND") return startOver("Your saved registration has expired. Please check your details again.");
      const fields = order?.data.fields as Record<string, string[]> | undefined;
      if (fields) {
        setErrors(firstErrors(fields));
        setStep(Object.keys(fields).some((key) => key === "nickname" || key.startsWith("topics.")) ? "preferences" : "details");
      }
      setMessage(String(order?.data.error ?? "We couldn't start the payment. Please try again."));
      return;
    }
    const dial = findCountry(details.phoneCountry)?.dial ?? "";
    await open(order.data as RazorpayOrder, {
      description: `${programmeName} · ${plan.name}`,
      prefill: { name: details.parentName, email: details.email, contact: `+${dial}${details.phone.replace(/\D/g, "")}` },
      notes: { reference: saved.reference ?? "" },
    });
  }

  const duration = `${plan.durationMonths} ${plan.durationMonths === 1 ? "month" : "months"}`;
  const summary = (
    <aside className="self-start rounded-[28px] bg-card p-6 shadow-card lg:sticky lg:top-36 lg:p-8" aria-label="Your plan">
      <p className="text-[15px] font-bold text-tan">Ages {plan.ageGroup} · {programmeName}</p>
      <h2 className="mt-1 font-display text-[28px] font-semibold leading-tight text-ink">{plan.name}</h2>
      {plan.description && <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{plan.description}</p>}
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
      <Link href={plansHref} className="mt-5 inline-block text-[15px] font-bold underline underline-offset-4">Choose another plan</Link>
    </aside>
  );

  const heading = "font-display text-[30px] font-semibold leading-tight text-ink outline-none lg:text-[38px]";
  const primary = "inline-flex h-[48px] items-center justify-center rounded-full border border-r-[3px] border-b-[3px] border-cocoa bg-amber px-8 text-[18px] font-bold text-ink transition-colors hover:bg-[#f5b21c] disabled:cursor-not-allowed disabled:opacity-60";
  const secondary = "inline-flex h-[48px] items-center justify-center rounded-full border border-ink/30 px-7 text-[17px] font-bold text-ink hover:bg-stone disabled:opacity-60";
  const alert = message && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-[16px] font-bold text-red-800">{message}</p>;

  let panel: React.ReactNode;
  if (outcome === "paid") {
    panel = (
      <div role="status">
        <h1 ref={headingRef} tabIndex={-1} className={heading}>Registration complete. Welcome to Mindvines!</h1>
        <p className="mt-4 text-[18px] leading-relaxed">
          Payment received and {details.childName || "your child"}&apos;s subscription is active.
          {saved.reference && <> Your registration number is <strong>{saved.reference}</strong>: keep it to renew later.</>} We&apos;ll write to <strong>{details.email}</strong> with what happens next.
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
          {outcome === "failed" ? message || "Nothing has been charged for this attempt." : "You closed the payment window. Nothing was charged."} Your registration is saved, so you can try again.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => { setOutcome(null); setMessage(""); void pay(); }} className={primary}>Try again</button>
          <button type="button" onClick={() => { setOutcome(null); goTo("details"); }} className={secondary}>Edit my details</button>
        </div>
      </div>
    );
  } else if (!hydrated) {
    // Saved answers load in the browser; until then nothing of the form is shown.
    panel = <p className="text-[17px] font-bold text-ink/70">Loading the registration form…</p>;
  } else if (step === "details") {
    const text = (
      key: "childName" | "school" | "parentName" | "addressLine1" | "city" | "postalCode" | "phone" | "email",
      extra: React.InputHTMLAttributes<HTMLInputElement> = {},
    ) => (
      <input
        id={`f-${key}`}
        name={key}
        value={details[key]}
        onChange={(event) => setDetail(key, event.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={describedBy(key, errors, extra["aria-describedby"])}
        className={cn(INPUT, "h-12")}
        {...extra}
      />
    );
    panel = (
      <form onSubmit={submitDetails} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className={heading}>Your details</h1>
        <p className="mt-3 text-[16px] text-ink/70">Fields marked * are required.</p>

        <Section title="About your child">
          <FormField id="f-childName" label="Name of the child" required error={errors.childName} className="sm:col-span-2">
            {text("childName", { autoComplete: "off" })}
          </FormField>
          <FormField id="f-childDob" label="Date of birth" required error={errors.childDob}>
            <input
              id="f-childDob"
              name="childDob"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={details.childDob}
              onChange={(event) => setDetail("childDob", event.target.value)}
              aria-invalid={errors.childDob ? true : undefined}
              aria-describedby={describedBy("childDob", errors)}
              className={cn(INPUT, "h-12")}
            />
          </FormField>
          <FormField id="f-school" label="School name" required error={errors.school}>
            {text("school", { autoComplete: "off" })}
          </FormField>
          <FormField
            id="f-programme"
            label="Programme"
            required
            className="sm:col-span-2"
            hint={programmeChoices.length > 1 ? "Changing the programme updates the plan and price." : undefined}
          >
            <select
              id="f-programme"
              value={plan.id}
              onChange={(event) => event.target.value !== plan.id && router.push(`/checkout/${event.target.value}`)}
              aria-describedby={programmeChoices.length > 1 ? "f-programme-hint" : undefined}
              className={cn(INPUT, "h-12")}
            >
              {programmeChoices.map((choice) => (
                <option key={choice.planId} value={choice.planId}>Ages {plan.ageGroup} · {choice.name}</option>
              ))}
            </select>
          </FormField>
        </Section>

        <Section title="Parent or guardian">
          <FormField id="f-parentName" label="Parent's name" required error={errors.parentName} className="sm:col-span-2">
            {text("parentName", { autoComplete: "name" })}
          </FormField>
        </Section>

        <Section title="Address" description="Where we'll send and collect the journals.">
          <FormField id="f-countryCode" label="Country/Region" required error={errors.countryCode} className="sm:col-span-2">
            <select
              id="f-countryCode"
              name="countryCode"
              autoComplete="country"
              value={details.countryCode}
              onChange={(event) => setDetail("countryCode", event.target.value)}
              aria-invalid={errors.countryCode ? true : undefined}
              aria-describedby={describedBy("countryCode", errors)}
              className={cn(INPUT, "h-12")}
            >
              {countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
          </FormField>
          <FormField id="f-addressLine1" label="Address" required error={errors.addressLine1} className="sm:col-span-2">
            {text("addressLine1", { autoComplete: "address-line1", placeholder: "House number, street, area" })}
          </FormField>
          <FormField id="f-addressLine2" label="Address line 2" error={errors.addressLine2} className="sm:col-span-2" hint="Optional: apartment, floor, landmark.">
            <textarea
              id="f-addressLine2"
              name="addressLine2"
              rows={2}
              autoComplete="address-line2"
              value={details.addressLine2}
              onChange={(event) => setDetail("addressLine2", event.target.value)}
              aria-describedby={describedBy("addressLine2", errors, "f-addressLine2-hint")}
              className={cn(INPUT, "py-3")}
            />
          </FormField>
          <FormField id="f-city" label="City" required error={errors.city}>
            {text("city", { autoComplete: "address-level2" })}
          </FormField>
          <FormField id="f-postalCode" label="ZIP / Postal code" required error={errors.postalCode}>
            {text("postalCode", { autoComplete: "postal-code" })}
          </FormField>
        </Section>

        <Section title="Contact">
          <FormField
            id="f-phone"
            label="Mobile number (WhatsApp preferred)"
            required
            error={errors.phone ?? errors.phoneCountry}
            className="sm:col-span-2"
            hint="We'll use this number to send important operational updates about your child's Mindvines subscription, including dispatches, collections, delivery notifications and support."
          >
            <div className="mt-1 grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] gap-2">
              <select
                id="f-phoneCountry"
                aria-label="Country code"
                value={details.phoneCountry}
                onChange={(event) => setDetail("phoneCountry", event.target.value)}
                className={cn(INPUT, "mt-0 h-12 px-3")}
              >
                {countries.map((country) => <option key={country.code} value={country.code}>{country.name} (+{country.dial})</option>)}
              </select>
              {text("phone", { type: "tel", autoComplete: "tel-national", inputMode: "tel", "aria-describedby": "f-phone-hint", className: cn(INPUT, "mt-0 h-12") })}
            </div>
          </FormField>
          <FormField id="f-email" label="Email" required error={errors.email} className="sm:col-span-2">
            {text("email", { type: "email", autoComplete: "email", inputMode: "email" })}
          </FormField>
        </Section>

        <fieldset className="mt-8 space-y-4">
          <legend className="text-[18px] font-bold">Permissions</legend>
          <Consent id="f-acceptTerms" checked={details.acceptTerms} onChange={(value) => setDetail("acceptTerms", value)} error={errors.acceptTerms} required>
            I have read and agree to the{" "}
            <a href={legal.terms} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">Terms &amp; Conditions</a>{" "}
            and <a href={legal.privacy} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">Privacy Policy</a>, and
            consent to my child&apos;s participation in the Mindvines programme.
          </Consent>
          <Consent id="f-allowFeature" checked={details.allowFeature} onChange={(value) => setDetail("allowFeature", value)}>
            I give permission for my child&apos;s writing or sketches to be featured by Mindvines on its website or social media.
            <span className="text-ink/60"> (Optional)</span>
          </Consent>
          <Consent id="f-whatsappUpdates" checked={details.whatsappUpdates} onChange={(value) => setDetail("whatsappUpdates", value)}>
            I&apos;d like to receive news, offers and announcements from Mindvines on WhatsApp.
            <span className="text-ink/60"> (Optional)</span>
          </Consent>
        </fieldset>

        {alert}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primary}>{busy ? "Saving…" : "Continue"}</button>
          <Link href={plansHref} className={secondary}>Previous</Link>
        </div>
      </form>
    );
  } else if (step === "preferences") {
    panel = (
      <form onSubmit={submitPreferences} noValidate>
        <h1 ref={headingRef} tabIndex={-1} className={heading}>Your preferences</h1>

        <div className="mt-6">
          <FormField
            id="f-nickname"
            label="Give a fun nickname"
            required
            error={errors.nickname}
            hint="Your child will write this nickname on each entry instead of their real name, so pick something fun!"
          >
            <input
              id="f-nickname"
              name="nickname"
              autoComplete="off"
              value={saved.nickname}
              onChange={(event) => setSaved((current) => ({ ...current, nickname: event.target.value }))}
              aria-invalid={errors.nickname ? true : undefined}
              aria-describedby={describedBy("nickname", errors, "f-nickname-hint")}
              className={cn(INPUT, "h-12")}
            />
          </FormField>
        </div>

        {categories.map((category) => (
          <TopicPicker
            key={category.id}
            category={category}
            fieldKey={topicsKey(category.id)}
            picked={saved.selections[category.id] ?? []}
            onToggle={(topicId) => toggleTopic(category.id, topicId)}
            error={errors[topicsKey(category.id)]}
          />
        ))}

        {alert}
        <div className="mt-10 flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primary}>{busy ? "Saving…" : "Continue to payment"}</button>
          <button type="button" onClick={() => goTo("details")} disabled={busy} className={secondary}>Previous</button>
        </div>
      </form>
    );
  } else {
    const age = details.childDob ? ageInYears(details.childDob) : null;
    const dial = findCountry(details.phoneCountry)?.dial;
    const countryLabel = countries.find((item) => item.code === details.countryCode)?.name ?? details.countryCode;
    panel = (
      <div>
        <h1 ref={headingRef} tabIndex={-1} className={heading}>Review and pay</h1>
        {saved.reference && <p className="mt-2 text-[15px] text-ink/70">Registration reference <strong className="text-ink">{saved.reference}</strong></p>}

        <SummaryBlock title="Your details" onEdit={() => goTo("details")} disabled={busy}>
          <Row label="Child">{[details.childName, age !== null && `${age} years`].filter(Boolean).join(", ")}</Row>
          <Row label="School">{details.school}</Row>
          <Row label="Parent">{details.parentName}</Row>
          <Row label="Email">{details.email}</Row>
          <Row label="Mobile">{`+${dial} ${details.phone}`}</Row>
          <Row label="Address">{[details.addressLine1, details.addressLine2, details.city, details.postalCode, countryLabel].filter(Boolean).join(", ")}</Row>
        </SummaryBlock>

        <SummaryBlock title="Your preferences" onEdit={() => goTo("preferences")} disabled={busy}>
          <Row label="Nickname">{saved.nickname}</Row>
          {categories.map((category) => (
            <Row key={category.id} label={category.name}>{`${(saved.selections[category.id] ?? []).length} topics chosen`}</Row>
          ))}
        </SummaryBlock>

        <SummaryBlock title="Your order">
          <Row label="Programme">{`Ages ${plan.ageGroup} · ${programmeName}`}</Row>
          <Row label="Plan">{plan.name}</Row>
          <Row label="Duration">{duration}</Row>
          <Row label="Price">{formatPaise(amounts.baseAmount)}</Row>
          <Row label={`GST (${gstPercent}%)`}>{formatPaise(amounts.taxAmount)}</Row>
          <Row label="Total payable" strong>{formatPaise(amounts.totalAmount)}</Row>
        </SummaryBlock>

        {alert}
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={pay} disabled={busy} className={primary}>
            {busy ? "Please wait…" : `Pay now ${formatPaise(amounts.totalAmount)}`}
          </button>
          <button type="button" onClick={() => goTo("preferences")} disabled={busy} className={secondary}>Previous</button>
        </div>
        <p className="mt-4 text-[14px] text-ink/70">Payments are processed by Razorpay. We never see your card or UPI details. Your subscription starts once the payment is confirmed.</p>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8 lg:py-[64px]">
        {!outcome && (
          <nav aria-label="Registration progress" className="mb-8">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 text-[15px] sm:text-[16px]">
              {STEPS.map((item, index) => {
                const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
                const label = (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full border-2 text-[14px] font-bold tabular-nums",
                        state === "current" && "border-ink bg-ink text-paper",
                        state === "done" && "border-amber bg-amber text-ink",
                        state === "todo" && "border-ink/25 text-ink/50",
                      )}
                    >
                      {state === "done" ? "✓" : String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={cn("font-bold", state === "todo" && "text-ink/50")}>{item.label}</span>
                  </>
                );
                return (
                  <li key={item.id} className="flex items-center gap-2">
                    {state === "done" && !busy ? (
                      <button type="button" onClick={() => goTo(item.id)} className="flex items-center gap-2 rounded-full pr-2 hover:underline">
                        {label}
                        <span className="sr-only">(completed, go back)</span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-2 pr-2" aria-current={state === "current" ? "step" : undefined}>{label}</span>
                    )}
                    {index < STEPS.length - 1 && <span aria-hidden className="text-ink/40">→</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
          <div className="rounded-[28px] bg-paper p-6 shadow-card lg:p-10">{panel}</div>
          {summary}
        </div>
      </div>
    </section>
  );
}

/** The ids a field's hint and error take, for its aria-describedby. */
function describedBy(key: string, errors: Errors, hint?: string) {
  return [hint, errors[key] ? `f-${key}-error` : undefined].filter(Boolean).join(" ") || undefined;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-8">
      <legend className="text-[18px] font-bold">{title}</legend>
      {description && <p className="text-[15px] text-ink/70">{description}</p>}
      <div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function FormField({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[16px] font-bold">
        {label}
        {required && <span aria-hidden className="text-red-700">*</span>}
      </label>
      {children}
      {hint && <p id={`${id}-hint`} className="mt-1 text-[14px] leading-snug text-ink/70">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-[14px] font-bold text-red-700">{error}</p>}
    </div>
  );
}

function Consent({
  id,
  checked,
  onChange,
  required,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-3 text-[16px] leading-snug">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-amber"
        />
        <label htmlFor={id}>
          {children}
          {required && <span aria-hidden className="text-red-700">*</span>}
        </label>
      </div>
      {error && <p id={`${id}-error`} className="ml-8 mt-1 text-[14px] font-bold text-red-700">{error}</p>}
    </div>
  );
}

function SummaryBlock({ title, onEdit, disabled, children }: { title: string; onEdit?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-field-line p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-[18px] font-bold">{title}</h2>
        {onEdit && (
          <button type="button" onClick={onEdit} disabled={disabled} className="text-[15px] font-bold underline underline-offset-4 disabled:opacity-50">
            Edit<span className="sr-only"> {title.toLowerCase()}</span>
          </button>
        )}
      </div>
      <dl className="mt-3 space-y-2 text-[16px]">{children}</dl>
    </section>
  );
}

function Row({ label, strong, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex justify-between gap-6", strong && "border-t border-ink/15 pt-2 text-[19px] font-bold")}>
      <dt className={cn("shrink-0", !strong && "text-ink/70")}>{label}</dt>
      <dd className="break-words text-right">{children}</dd>
    </div>
  );
}
