import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscriptionPlans, SubscriptionPlansLoading } from "@/components/sections/SubscriptionPlans";
import { siteConfig } from "@/config/site";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

export const metadata: Metadata = {
  title: "Subscription Plans",
  description: "Explore Mindvines journal subscription plans for children aged 6–8 and 9–12. Compare prices, duration, journals, and benefits.",
  alternates: { canonical: `${siteConfig.url}/subscriptions` },
};

/** `?age=9-12` picks the age group; without it (or with an unknown one) the youngest shows. */
export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ age?: string | string[] }> }) {
  const { age: requested } = await searchParams;
  const age = SUBSCRIPTION_AGE_GROUPS.find((option) => option === requested) ?? SUBSCRIPTION_AGE_GROUPS[0];

  return (
    <Suspense fallback={<SubscriptionPlansLoading age={age} />}>
      <SubscriptionPlans age={age} />
    </Suspense>
  );
}
