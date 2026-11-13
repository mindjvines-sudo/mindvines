/**
 * Whether a standard subscription plan may be shown and bought, kept free of
 * the database so the public pages, the server and the tests agree. A plan
 * saved before these controls existed has none of the fields and behaves as
 * before: on, visible, button enabled.
 *
 *  - Inactive: switched off for new registrations; its card is hidden too.
 *  - Hidden: no card, and no way in through a direct link or API call.
 *  - Button disabled: the card shows, with a reason, but cannot be bought.
 *
 * Existing subscriptions, payments and renewals never consult this.
 */

export type PlanControls = {
  status: string;
  subscriptionActive?: boolean | null;
  cardVisible?: boolean | null;
  subscribeEnabled?: boolean | null;
  disabledMessage?: string | null;
};

export type PlanAvailability = "AVAILABLE" | "BUTTON_DISABLED" | "HIDDEN" | "INACTIVE" | "UNPUBLISHED";

export const DEFAULT_DISABLED_MESSAGE = "Registration currently unavailable.";

export function planAvailability(plan: PlanControls): PlanAvailability {
  if (plan.status !== "PUBLISHED") return "UNPUBLISHED";
  if (plan.subscriptionActive === false) return "INACTIVE";
  if (plan.cardVisible === false) return "HIDDEN";
  if (plan.subscribeEnabled === false) return "BUTTON_DISABLED";
  return "AVAILABLE";
}

/** Plans whose card the public may see. */
export const isListed = (availability: PlanAvailability) => availability === "AVAILABLE" || availability === "BUTTON_DISABLED";

/** The message shown on a card whose button is disabled. */
export const disabledMessage = (plan: Pick<PlanControls, "disabledMessage">) => plan.disabledMessage?.trim() || DEFAULT_DISABLED_MESSAGE;

/** What a customer is told when a new registration for the plan is refused. */
export function planRefusal(plan: PlanControls): string | null {
  switch (planAvailability(plan)) {
    case "AVAILABLE":
      return null;
    case "BUTTON_DISABLED":
      return disabledMessage(plan);
    default:
      return "This plan is no longer available. Please choose another.";
  }
}

/** Database filters equal to the checks above, for lists the public sees and for the plans that can be bought. */
export const LISTED_PLAN_FILTER = { status: "PUBLISHED", subscriptionActive: { $ne: false }, cardVisible: { $ne: false } } as const;
export const ORDERABLE_PLAN_FILTER = { ...LISTED_PLAN_FILTER, subscribeEnabled: { $ne: false } } as const;
