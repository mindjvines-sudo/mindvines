import Link from "next/link";
import { connection } from "next/server";

import { AgeGroupPricing } from "@/components/age-group/AgeGroupSections";
import { AgePlanSwitcher } from "@/components/sections/AgePlanSwitcher";
import { DEFAULT_FOOTNOTE, DEFAULT_PRICE_NOTE, toPlanOptions } from "@/lib/plan-options";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";
import { listAgeGroupPagesByPlanAge } from "@/services/age-group.service";
import { listPublishedSubscriptionPlans } from "@/services/subscription.service";

export type SubscriptionAge = (typeof SUBSCRIPTION_AGE_GROUPS)[number];

const TITLE = "Subscription plans";
const INTRO = "Choose a journal journey for your child. A little time to write, sketch, and discover a different point of view.";

/** The same panel for every age, while the plans load or when they can't. */
function samePanelForEveryAge(age: SubscriptionAge, panel: React.ReactNode) {
  return (
    <AgePlanSwitcher
      title={TITLE}
      intro={INTRO}
      initial={age}
      panels={SUBSCRIPTION_AGE_GROUPS.map((option) => ({ age: option, panel }))}
    />
  );
}

export function SubscriptionPlansLoading({ age }: { age: SubscriptionAge }) {
  return samePanelForEveryAge(
    age,
    <section aria-label="Subscription plans" aria-busy="true" className="bg-tan px-5 py-24 text-center font-bold text-ink">
      Loading plans…
    </section>,
  );
}

/**
 * Each age group's plans in the same plan band as that age group's own page
 * (a tab per duration, that duration's plans as cards), under a switch that
 * shows one age at a time, `age` first. Everything comes from Admin →
 * Subscriptions, fetched once for every age so switching is instant.
 */
export async function SubscriptionPlans({ age }: { age: SubscriptionAge }) {
  await connection();
  let plans: Awaited<ReturnType<typeof listPublishedSubscriptionPlans>>;
  let pages: Awaited<ReturnType<typeof listAgeGroupPagesByPlanAge>>;
  try {
    [plans, pages] = await Promise.all([listPublishedSubscriptionPlans(), listAgeGroupPagesByPlanAge()]);
  } catch {
    return samePanelForEveryAge(age, <Notice>We couldn’t load the plans right now. Please try again or get in touch for details.</Notice>);
  }

  const panels = SUBSCRIPTION_AGE_GROUPS.map((option) => {
    const agePlans = plans.filter((plan) => plan.ageGroup === option);
    const notes = pages.find((page) => page.ageGroup === option);
    return {
      age: option,
      panel:
        agePlans.length > 0 ? (
          <AgeGroupPricing
            id={`plans-${option}`}
            animate={false}
            heading="Choose your subscription plan"
            intro=""
            items={toPlanOptions(agePlans)}
            priceNote={notes?.priceNote || DEFAULT_PRICE_NOTE}
            footnote={notes?.footnote || DEFAULT_FOOTNOTE}
          />
        ) : (
          <Notice>New plans for ages {option} will be announced soon.</Notice>
        ),
    };
  });

  return <AgePlanSwitcher key={age} title={TITLE} intro={INTRO} initial={age} panels={panels} />;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-tan px-5 py-20 text-ink">
      <div className="mx-auto max-w-xl rounded-[28px] bg-paper p-8 text-center text-lg">
        <p>{children}</p>
        <Link href="/#contact" className="mt-4 inline-block font-bold underline underline-offset-4">
          Get in touch for details
        </Link>
      </div>
    </section>
  );
}
