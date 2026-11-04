import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import { computeAmounts } from "@/lib/subscription-status";
import { getPublishedAgeGroupSlugForPlans } from "@/services/age-group.service";
import { getSubscriptionPlan } from "@/services/subscription.service";
import { gstRatePercent } from "@/services/checkout.service";

export const metadata: Metadata = { title: "Subscribe", robots: { index: false, follow: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ planId: string }> }) {
  await connection();
  const { planId } = await params;
  const plan = await getSubscriptionPlan(planId);
  if (!plan || plan.status !== "PUBLISHED") notFound();

  const gstPercent = gstRatePercent();
  // Back to the plan band this plan came from, wherever the admin published it.
  const slug = await getPublishedAgeGroupSlugForPlans(plan.ageGroup);
  const plansHref = slug ? `/age-groups/${slug}#plans` : "/";
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
      amounts={computeAmounts(plan.price, gstPercent)}
      gstPercent={gstPercent}
      plansHref={plansHref}
    />
  );
}
