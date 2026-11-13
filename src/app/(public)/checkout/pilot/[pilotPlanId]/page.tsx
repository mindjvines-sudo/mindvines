import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { FOOTER_LINKS } from "@/lib/content";
import { computeAmounts } from "@/lib/subscription-status";
import { pilotAvailability, slotsLeft } from "@/lib/pilot";
import { gstRatePercent } from "@/services/checkout.service";
import { getPilotPlanForVisitor } from "@/services/pilot.service";
import { getProgramme } from "@/services/programme.service";
import { getSubscriptionPlan } from "@/services/subscription.service";
import { listPreferenceCategories } from "@/services/topic.service";

export const metadata: Metadata = { title: "Pilot Registration", robots: { index: false, follow: false } };

const legalHref = (label: string) => FOOTER_LINKS.find((link) => link.label.startsWith(label))?.href ?? "/";

/**
 * The registration form for a pilot plan. A plan that is inactive, outside
 * its window or restricted (without its code) is simply not found; a plan
 * that is full says so. The form itself re-checks all of this on the server.
 */
export default async function PilotCheckoutPage({ params, searchParams }: { params: Promise<{ pilotPlanId: string }>; searchParams: Promise<{ code?: string | string[] }> }) {
  await connection();
  const { pilotPlanId } = await params;
  const { code: rawCode } = await searchParams;
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim().slice(0, 40);

  const pilot = await getPilotPlanForVisitor(pilotPlanId, code);
  if (!pilot) notFound();
  if (pilotAvailability(pilot) === "FULLY_BOOKED") {
    return (
      <section className="bg-cream px-5 py-16 sm:px-8">
        <div role="status" className="mx-auto max-w-[640px] rounded-[28px] bg-card p-8 shadow-card">
          <h1 className="font-display text-[30px] font-semibold text-ink">This pilot plan is fully booked</h1>
          <p className="mt-3 text-[18px] leading-relaxed">Thank you for your interest. All the places in {pilot.name} have been taken.</p>
          <Link href="/subscriptions" className="mt-6 inline-block font-bold underline underline-offset-4">See standard plans</Link>
        </div>
      </section>
    );
  }

  const base = await getSubscriptionPlan(pilot.basePlan.toString());
  if (!base) notFound();
  const [programme, preferences] = await Promise.all([
    base.programme ? getProgramme(base.programme.toString()) : null,
    listPreferenceCategories(base.programme),
  ]);

  const gstPercent = gstRatePercent();
  const programmeName = programme?.name ?? base.name;
  return (
    <CheckoutFlow
      plan={{
        id: base._id.toString(),
        name: pilot.name,
        description: pilot.description || base.description,
        ageGroup: base.ageGroup,
        durationMonths: pilot.durationMonths,
        journalCount: base.journalCount,
        features: base.features,
      }}
      programmeName={programmeName}
      programmeChoices={[{ programmeId: "", name: programmeName, planId: base._id.toString() }]}
      categories={preferences.categories}
      amounts={computeAmounts(pilot.offerPrice, gstPercent)}
      gstPercent={gstPercent}
      plansHref="/pilot"
      legal={{ terms: legalHref("Terms"), privacy: legalHref("Privacy") }}
      pilot={{
        id: pilot._id.toString(),
        accessCode: pilot.eligibilityType === "PUBLIC" ? undefined : code,
        originalAmount: computeAmounts(pilot.originalPrice, gstPercent).baseAmount,
        terms: pilot.termsAndConditions ?? "",
        slotsLeft: slotsLeft(pilot),
      }}
    />
  );
}
