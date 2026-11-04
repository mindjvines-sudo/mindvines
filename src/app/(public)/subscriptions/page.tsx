import type { Metadata } from "next";
import { Suspense } from "react";
import { SubscriptionPlans, SubscriptionPlansLoading } from "@/components/sections/SubscriptionPlans";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Subscription Plans",
  description: "Explore Mindvines journal subscription plans for children aged 6–8 and 9–12. Compare prices, duration, journals, and benefits.",
  alternates: { canonical: `${siteConfig.url}/subscriptions` },
};

export default function SubscriptionsPage() {
  return <>
    <div className="bg-paper px-5 py-14 text-center text-ink">
      <h1 className="fluid-heading font-display font-bold">A journal journey of their own</h1>
      <p className="mx-auto mt-5 max-w-xl text-lg">Find the right plan for your child’s age and curiosity.</p>
    </div>
    <Suspense fallback={<SubscriptionPlansLoading />}><SubscriptionPlans /></Suspense>
  </>;
}
