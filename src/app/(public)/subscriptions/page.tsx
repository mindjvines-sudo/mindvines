import type { Metadata } from "next";
import { withSystemSeo } from "@/lib/cms/system-seo";
import { PageBody } from "@/components/cms/PageBody";
import { getSystemLayout } from "@/lib/cms/public";
import { Suspense } from "react";
import { RegistrationTypeSwitch } from "@/components/pilot/RegistrationTypeSwitch";
import { SubscriptionPlans, SubscriptionPlansLoading } from "@/components/sections/SubscriptionPlans";
import { siteConfig } from "@/config/site";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

const baseMetadata: Metadata = {
  title: "Subscription Plans",
  description: "Explore Mindvines journal subscription plans for children aged 6–8 and 9–12. Compare prices, duration, journals, and benefits.",
  alternates: { canonical: `${siteConfig.url}/subscriptions` },
};

/** `?age=9-12` picks the age group; without it (or with an unknown one) the youngest shows. */
export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ age?: string | string[] }> }) {
  const { age: requested } = await searchParams;
  const layout = await getSystemLayout("subscriptions");
  if (layout) return <PageBody sections={layout.sections} template={layout.template} ctx={{ pageKey: "subscriptions", age: typeof requested === "string" ? requested : undefined }} />;
  const age = SUBSCRIPTION_AGE_GROUPS.find((option) => option === requested) ?? SUBSCRIPTION_AGE_GROUPS[0];

  return (
    <>
      <RegistrationTypeSwitch current="standard" />
      <Suspense fallback={<SubscriptionPlansLoading age={age} />}>
      <SubscriptionPlans age={age} />
      </Suspense>
    </>
  );
}

export const generateMetadata = (): Promise<Metadata> => withSystemSeo("subscriptions", baseMetadata);
