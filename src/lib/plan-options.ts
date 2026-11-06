import type { PlanCardContent, PlanOptionContent } from "@/lib/content";

/** The plan band's wording when the admin leaves it empty. Checkout always adds GST, so the band says so. */
export const DEFAULT_PRICE_NOTE = "plus GST";
export const DEFAULT_FOOTNOTE = "Switch or cancel anytime";

/** Billing-period labels for the common durations; others read "N months". */
const PERIODS: Record<number, string> = { 1: "month", 3: "quarter", 12: "year" };

export type PublishedPlan = {
  _id: { toString(): string };
  name: string;
  price: number;
  durationMonths: number;
  badge?: string | null;
  buttonLabel?: string | null;
  featured: boolean;
  displayOrder?: number | null;
};

function toCard(plan: PublishedPlan): PlanCardContent {
  return {
    title: plan.name,
    price: plan.price,
    period: PERIODS[plan.durationMonths] ?? `${plan.durationMonths} months`,
    badge: plan.badge ?? "",
    highlight: plan.featured,
    buttonLabel: plan.buttonLabel || "Subscribe now",
    buttonHref: `/checkout/${plan._id.toString()}`,
  };
}

/**
 * Published plans as the band's tabs: one per duration present, shortest
 * first, each holding that duration's plans in display order.
 */
export function toPlanOptions(plans: PublishedPlan[]): PlanOptionContent[] {
  const byDuration = new Map<number, PublishedPlan[]>();
  for (const plan of plans) byDuration.set(plan.durationMonths, [...(byDuration.get(plan.durationMonths) ?? []), plan]);
  return [...byDuration.entries()]
    .sort(([a], [b]) => a - b)
    .map(([months, group]) => ({
      tab: months === 1 ? "Monthly" : `${months} months`,
      cards: [...group].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map(toCard),
    }));
}
