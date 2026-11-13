import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { disabledMessage, isListed, planAvailability } from "@/lib/plan-availability";
import { FOOTER_LINKS } from "@/lib/content";
import { computeAmounts } from "@/lib/subscription-status";
import { getPublishedAgeGroupSlugForPlans } from "@/services/age-group.service";
import { gstRatePercent } from "@/services/checkout.service";
import { getProgramme, listProgrammeChoices } from "@/services/programme.service";
import { getSubscriptionPlan } from "@/services/subscription.service";
import { listPreferenceCategories } from "@/services/topic.service";

export const metadata: Metadata = { title: "Register", robots: { index: false, follow: false } };

const legalHref = (label: string) => FOOTER_LINKS.find((link) => link.label.startsWith(label))?.href ?? "/";

/** The registration form for one plan: your details, your preferences, payment. */
export default async function CheckoutPage({ params }: { params: Promise<{ planId: string }> }) {
  await connection();
  const { planId } = await params;
  const plan = await getSubscriptionPlan(planId);
  if (!plan) notFound();
  // Hidden, inactive and unpublished plans are not found; a plan whose button is off says why. The server refuses them again on save and at payment.
  const availability = planAvailability(plan);
  if (!isListed(availability)) notFound();
  if (availability === "BUTTON_DISABLED") {
    return (
      <section className="bg-cream px-5 py-16 sm:px-8">
        <div role="status" className="mx-auto max-w-[640px] rounded-[28px] bg-card p-8 shadow-card">
          <h1 className="font-display text-[30px] font-semibold text-ink">{plan.name}</h1>
          <p className="mt-3 text-[18px] leading-relaxed">{disabledMessage(plan)}</p>
          <Link href="/subscriptions" className="mt-6 inline-block font-bold underline underline-offset-4">See other plans</Link>
        </div>
      </section>
    );
  }

  const [slug, programme, choices, preferences] = await Promise.all([
    // Back to the plan band this plan came from, wherever the admin published it.
    getPublishedAgeGroupSlugForPlans(plan.ageGroup),
    plan.programme ? getProgramme(plan.programme.toString()) : null,
    listProgrammeChoices(plan.ageGroup, plan.durationMonths),
    listPreferenceCategories(plan.programme),
  ]);

  const gstPercent = gstRatePercent();
  return (
    <CheckoutFlow
      plan={{
        id: plan._id.toString(),
        name: plan.name,
        description: plan.description,
        ageGroup: plan.ageGroup,
        durationMonths: plan.durationMonths,
        journalCount: plan.journalCount,
        features: plan.features,
      }}
      programmeName={programme?.name ?? plan.name}
      programmeChoices={choices.length > 0 ? choices : [{ programmeId: "", name: programme?.name ?? plan.name, planId: plan._id.toString() }]}
      categories={preferences.categories}
      amounts={computeAmounts(plan.price, gstPercent)}
      gstPercent={gstPercent}
      plansHref={slug ? `/age-groups/${slug}#plans` : "/subscriptions"}
      legal={{ terms: legalHref("Terms"), privacy: legalHref("Privacy") }}
    />
  );
}
