import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { RegistrationTypeSwitch } from "@/components/pilot/RegistrationTypeSwitch";
import { PILOT_FEATURES, PILOT_HEADING, PILOT_LEAD, PILOT_STEPS } from "@/lib/pilot-content";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { formatPlanPrice } from "@/lib/subscriptions";
import { findPilotPlanByCode, listPublicPilotPlans, type PublicPilotPlan } from "@/services/pilot.service";

export const metadata: Metadata = { title: "Pilot Registration", robots: { index: false, follow: false } };

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" });
const months = (count: number) => `${count} ${count === 1 ? "month" : "months"}`;

function PlanCard({ plan, code }: { plan: PublicPilotPlan; code?: string }) {
  const open = plan.availability === "OPEN";
  const href = `/checkout/pilot/${plan.id}${code ? `?code=${encodeURIComponent(code)}` : ""}`;
  return (
    <li className="flex flex-col rounded-[28px] bg-card p-6 shadow-card lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-bold text-tan">{[plan.ageGroup && `Ages ${plan.ageGroup}`, plan.programmeName].filter(Boolean).join(" · ")}</p>
        {plan.savingsPercent > 0 && <span className="rounded-full bg-amber px-3 py-1 text-[13px] font-bold text-ink">Save {plan.savingsPercent}%</span>}
      </div>
      <h2 className="mt-1 font-display text-[28px] font-semibold leading-tight text-ink">{plan.name}</h2>
      {plan.description && <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{plan.description}</p>}
      <p className="mt-5 text-[16px] font-bold">{months(plan.durationMonths)}</p>
      <p className="mt-2 flex items-baseline gap-3">
        <span className="font-display text-[34px] font-semibold text-ink">{formatPlanPrice(plan.offerPrice)}</span>
        {plan.originalPrice > plan.offerPrice && <span className="text-[18px] text-ink/60 line-through">{formatPlanPrice(plan.originalPrice)}</span>}
        <span className="text-[14px] text-ink/70">+ GST</span>
      </p>
      <p className="mt-3 text-[15px]">
        {open ? (plan.slotsLeft <= 20 ? <strong>Only {plan.slotsLeft} {plan.slotsLeft === 1 ? "place" : "places"} left</strong> : <>{plan.slotsLeft} places available</>) : <strong>Fully booked</strong>}
        {" · "}Register by {dateLabel(plan.endDate)}
      </p>
      {plan.terms && (
        <details className="mt-4 text-[15px]">
          <summary className="cursor-pointer font-bold">Terms of this offer</summary>
          <p className="mt-2 whitespace-pre-line leading-relaxed">{plan.terms}</p>
        </details>
      )}
      <div className="mt-6 pt-2">
        {open ? (
          <Link href={href} className="inline-flex h-[48px] items-center justify-center rounded-full border border-r-[3px] border-b-[3px] border-cocoa bg-amber px-8 text-[18px] font-bold text-ink transition-colors hover:bg-[#f5b21c]">Register for this pilot</Link>
        ) : (
          <p role="status" className="rounded-xl bg-stone px-4 py-3 text-[16px] font-bold">This pilot plan is fully booked. Thank you for your interest.</p>
        )}
      </div>
    </li>
  );
}

/**
 * Pilot offers. Only active, public plans inside their window are listed;
 * restricted plans appear only to someone holding their access code.
 */
export default async function PilotPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  await connection();
  const { code: rawCode } = await searchParams;
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim().slice(0, 40);

  let plans: PublicPilotPlan[] = [];
  let restricted: PublicPilotPlan | null = null;
  let codeMessage = "";
  let failed = false;
  try {
    plans = await listPublicPilotPlans();
    if (code) {
      const ip = clientIp(await headers());
      if (!checkRateLimit(`pilot-code:ip:${ip}`, { limit: 10, windowMs: 10 * 60 * 1000 }).allowed) {
        codeMessage = "Too many attempts. Please try again in a few minutes.";
      } else {
        restricted = await findPilotPlanByCode(code);
        if (!restricted) codeMessage = "That access code isn't valid, or the offer has closed.";
      }
    }
  } catch {
    failed = true;
  }
  const listed = restricted ? [restricted, ...plans.filter((plan) => plan.id !== restricted!.id)] : plans;

  return (
    <>
      <RegistrationTypeSwitch current="pilot" />
      <section className="bg-cream px-5 py-10 sm:px-8 lg:py-[64px]">
        <div className="mx-auto max-w-[1100px]">
          <h1 className="font-display text-[34px] font-semibold leading-tight text-ink lg:text-[44px]">{PILOT_HEADING}</h1>
          <p className="mt-3 max-w-[720px] text-[18px] leading-relaxed">{PILOT_LEAD}</p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILOT_STEPS.map((step) => (
              <li key={step.title} className="rounded-[20px] bg-card p-5 shadow-card">
                <h2 className="text-[17px] font-bold text-ink">{step.title}</h2>
                <p className="mt-1 text-[16px] leading-relaxed">{step.text}</p>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 font-display text-[28px] font-semibold text-ink">Features of the pilot</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {PILOT_FEATURES.map((feature) => (
              <section key={feature.title} className={`rounded-[20px] bg-card p-5 shadow-card ${feature.wide ? "sm:col-span-2" : ""}`}>
                <h3 className="text-[17px] font-bold text-ink">{feature.title}</h3>
                <p className="mt-1 text-[16px] leading-relaxed">{feature.text}</p>
              </section>
            ))}
          </div>

          <h2 className="mt-12 font-display text-[28px] font-semibold text-ink">Register for the pilot</h2>
          <p className="mt-2 max-w-[720px] text-[17px] leading-relaxed">Choose a plan, then register your child with the usual form. Seats are limited, and registration is complete once your payment is confirmed.</p>

          {failed ? (
            <p role="alert" className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-[16px] font-bold text-red-800">We couldn&apos;t load the pilot plans right now. Please try again shortly.</p>
          ) : listed.length > 0 ? (
            <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listed.map((plan) => <PlanCard key={plan.id} plan={plan} code={restricted?.id === plan.id ? code : undefined} />)}
            </ul>
          ) : (
            <p role="status" className="mt-8 rounded-[28px] bg-card p-8 text-[18px] shadow-card">No pilot plans are open for registration right now. Please check back soon, or <Link href="/subscriptions" className="font-bold underline underline-offset-4">choose a standard plan</Link>.</p>
          )}

          <form method="get" className="mt-12 max-w-[460px]">
            <label htmlFor="code" className="text-[16px] font-bold">Have an access code?</label>
            <div className="mt-2 flex gap-3">
              <input id="code" name="code" defaultValue={code} autoComplete="off" spellCheck={false} maxLength={40} aria-describedby={codeMessage ? "code-error" : undefined} aria-invalid={codeMessage ? true : undefined} className="h-12 w-full rounded-xl border border-field-line bg-paper px-4 text-[17px] uppercase text-ink" />
              <button type="submit" className="inline-flex h-12 shrink-0 items-center rounded-full border border-ink/30 px-6 text-[16px] font-bold text-ink hover:bg-stone">Apply</button>
            </div>
            {codeMessage && <p id="code-error" role="alert" className="mt-2 text-[15px] font-bold text-red-800">{codeMessage}</p>}
          </form>
        </div>
      </section>
    </>
  );
}
