import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { AvailabilityCheck } from "@/components/pilot/AvailabilityCheck";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { PILOT_FEATURES_DEFAULT, PILOT_INTRO_DEFAULT, PILOT_PLANS_DEFAULT, type PilotFeaturesContent, type PilotIntroContent, type PilotPlansContent } from "@/lib/pilot-content";
import { formatPlanPrice } from "@/lib/subscriptions";
import { findPilotPlanByCode, listPublicPilotPlans, type PublicPilotPlan } from "@/services/pilot.service";

/** The pilot page is one cream band; its parts share the band's colour and gutters, so they read as one page. */
const BAND = "bg-cream px-5 sm:px-8";

export function PilotIntro({ content = PILOT_INTRO_DEFAULT }: { content?: PilotIntroContent }) {
  return (
    <section className={`${BAND} pt-10 lg:pt-[64px]`}>
      <div className="mx-auto max-w-[1100px]">
        <h1 className="font-display text-[34px] font-semibold leading-tight text-ink lg:text-[44px]">{content.heading}</h1>
        <p className="mt-3 text-[18px] leading-relaxed">{content.lead}</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.steps.map((step, index) => (
            <li key={index} className="rounded-[20px] bg-card p-5 shadow-card">
              <h2 className="text-[17px] font-bold text-ink">{step.title}</h2>
              <p className="mt-1 text-[16px] leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PilotFeatures({ content = PILOT_FEATURES_DEFAULT }: { content?: PilotFeaturesContent }) {
  return (
    <section className={`${BAND} pt-12`}>
      <div className="mx-auto max-w-[1100px]">
        <h2 className="font-display text-[28px] font-semibold text-ink">{content.heading}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {content.items.map((feature, index) => (
            <section key={index} className={`rounded-[20px] bg-card p-5 shadow-card ${feature.wide ? "sm:col-span-2" : ""}`}>
              <h3 className="text-[17px] font-bold text-ink">{feature.title}</h3>
              <p className="mt-1 text-[16px] leading-relaxed">{feature.text}</p>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

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
 * restricted plans appear only to someone holding their access code. The
 * wording around the cards can be edited; the plans, slots, access codes and
 * the registration links always come from the pilot backend.
 */
export async function PilotPlans({ code, content = PILOT_PLANS_DEFAULT }: { code?: string; content?: PilotPlansContent }) {
  await connection();
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
    <section className={`${BAND} pb-10 pt-12 lg:pb-[64px]`}>
      <div className="mx-auto max-w-[1100px]">
        <h2 className="font-display text-[28px] font-semibold text-ink">{content.heading}</h2>
        <p className="mt-2 max-w-[720px] text-[17px] leading-relaxed">{content.intro}</p>

        {failed ? (
          <p role="alert" className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-[16px] font-bold text-red-800">We couldn&apos;t load the pilot plans right now. Please try again shortly.</p>
        ) : listed.length > 0 ? (
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listed.map((plan) => <PlanCard key={plan.id} plan={plan} code={restricted?.id === plan.id ? code : undefined} />)}
          </ul>
        ) : (
          <p role="status" className="mt-8 rounded-[28px] bg-card p-8 text-[18px] shadow-card">No pilot plans are open for registration right now. Please check back soon, or <Link href="/subscriptions" className="font-bold underline underline-offset-4">choose a standard plan</Link>.</p>
        )}

        {codeMessage && <p role="alert" className="mt-8 text-[15px] font-bold text-red-800">{codeMessage}</p>}
        <AvailabilityCheck />
      </div>
    </section>
  );
}
