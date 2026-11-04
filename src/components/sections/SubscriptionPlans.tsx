import { connection } from "next/server";
import Link from "next/link";
import { PillButton } from "@/components/ui/PillButton";
import { formatPlanPrice, SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";
import { listPublishedSubscriptionPlans } from "@/services/subscription.service";

export function SubscriptionPlansLoading() {
  return <section aria-label="Subscription plans" aria-busy="true" className="bg-cream px-5 py-16 text-center text-ink">Loading subscription plans…</section>;
}

export async function SubscriptionPlans() {
  await connection();
  let plans: Awaited<ReturnType<typeof listPublishedSubscriptionPlans>>;
  try {
    plans = await listPublishedSubscriptionPlans();
  } catch {
    return <section id="subscriptions" className="bg-cream px-5 py-16 text-center text-ink">
      <h2 className="fluid-heading font-display font-bold">Subscription plans</h2>
      <p className="mx-auto mt-5 max-w-xl">We couldn’t load the plans right now. Please try again or get in touch for details.</p>
      <Link href="/#contact" className="mt-6 inline-block font-bold underline underline-offset-4">Contact us</Link>
    </section>;
  }

  return (
    <section id="subscriptions" className="scroll-mt-36 bg-cream text-ink">
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-24">
        <h2 className="fluid-heading text-center font-display font-bold">Subscription plans</h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-lg">Choose a journal journey for your child. A little time to write, sketch, and discover a different point of view.</p>
        <nav aria-label="Choose an age group" className="mt-8 flex flex-wrap justify-center gap-3">
          {SUBSCRIPTION_AGE_GROUPS.map((age) => <a key={age} href={`#ages-${age}`} className="rounded-full border border-ink/20 px-6 py-3 font-bold transition-colors hover:bg-stone">Ages {age}</a>)}
        </nav>

        {SUBSCRIPTION_AGE_GROUPS.map((age) => {
          const group = plans.filter((plan) => plan.ageGroup === age);
          return <div key={age} id={`ages-${age}`} className="scroll-mt-36 pt-12">
            <h3 className="font-display text-3xl font-semibold">Ages {age}</h3>
            <p className="mt-2">{age === "6-8" ? "Explore shared topics through sketching." : "Make room for writing, sketching, or both."}</p>
            {group.length === 0 ? (
              <div className="mt-6 rounded-[28px] bg-paper p-8 text-center">
                <p>New plans for this age group will be announced soon.</p>
                <Link href="/#contact" className="mt-4 inline-block font-bold underline underline-offset-4">Get in touch for details</Link>
              </div>
            ) : (
              <div className="mt-7 grid items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
                {group.map((plan) => <PlanCard key={plan._id.toString()} plan={plan} />)}
              </div>
            )}
          </div>;
        })}
      </div>
    </section>
  );
}

type Plan = Awaited<ReturnType<typeof listPublishedSubscriptionPlans>>[number];

/** One plan; also listed on each age group's page. */
export function PlanCard({ plan, headingLevel = "h4" }: { plan: Plan; headingLevel?: "h3" | "h4" }) {
  const Heading = headingLevel;
  return <article className={`flex h-full flex-col rounded-[30px] border-2 p-7 shadow-card ${plan.featured ? "border-cocoa bg-stone" : "border-transparent bg-paper"}`}>
    {plan.featured && <span className="mb-5 self-start rounded-full bg-cocoa px-4 py-1 text-sm font-bold text-paper">Recommended</span>}
    <Heading className="break-words font-display text-3xl font-semibold">{plan.name}</Heading>
    <p className="mt-3 whitespace-pre-line break-words leading-relaxed">{plan.description}</p>
    <p className="mt-6 text-4xl font-bold tabular-nums">{formatPlanPrice(plan.price)}</p>
    <p className="mt-2 text-sm">Total for {plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}</p>
    <p className="mt-6 border-t border-ink/15 pt-5 font-bold">{plan.journalCount} {plan.journalCount === 1 ? "journal" : "journals"} included</p>
    {plan.features.length > 0 && <ul className="mt-4 space-y-3">
      {plan.features.map((feature, index) => <li key={index} className="flex gap-3"><span aria-hidden className="font-bold">✓</span><span className="break-words">{feature}</span></li>)}
    </ul>}
    <div className="mt-auto pt-8"><PillButton href={`/checkout/${plan._id.toString()}`}>Choose this plan<span className="sr-only">: {plan.name}, ages {plan.ageGroup}</span></PillButton></div>
  </article>;
}
