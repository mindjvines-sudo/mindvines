/**
 * Subscription expiry and money rules, kept free of the database so the
 * public checkout, the admin and the cron job all agree. A stored status is
 * never trusted for expiry: whether a subscription is valid is always worked
 * out from its expiry date and the server's clock.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const EXPIRING_SOON_DAYS = 7;

/** What is saved. EXPIRED is persisted by the cron job but never relied on. */
export const STORED_SUBSCRIPTION_STATUSES = ["PENDING_PAYMENT", "ACTIVE", "EXPIRED", "CANCELLED"] as const;
export type StoredSubscriptionStatus = (typeof STORED_SUBSCRIPTION_STATUSES)[number];

/** What the admin shows and filters by. */
export const SUBSCRIPTION_STATES = [
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRING_TODAY",
  "EXPIRED",
  "PENDING_PAYMENT",
  "CANCELLED",
] as const;
export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number];

export const SUBSCRIPTION_STATE_LABELS: Record<SubscriptionState, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRING_TODAY: "Expiring today",
  EXPIRED: "Expired",
  PENDING_PAYMENT: "Pending payment",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUSES = ["CREATED", "PENDING", "PAID", "FAILED", "CANCELLED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Whole days left, rounded up, never negative: the last 24 hours count as 1 day. */
export function remainingDays(expiryDate: Date | string | null | undefined, now = new Date()): number {
  if (!expiryDate) return 0;
  const left = new Date(expiryDate).getTime() - now.getTime();
  return left > 0 ? Math.ceil(left / DAY_MS) : 0;
}

export function deriveState(
  subscription: { status: StoredSubscriptionStatus; expiryDate?: Date | string | null },
  now = new Date()
): SubscriptionState {
  if (subscription.status === "PENDING_PAYMENT") return "PENDING_PAYMENT";
  if (subscription.status === "CANCELLED") return "CANCELLED";
  const days = remainingDays(subscription.expiryDate, now);
  if (days === 0) return "EXPIRED";
  if (days === 1) return "EXPIRING_TODAY";
  if (days <= EXPIRING_SOON_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
}

/** The database filter for a state; it selects the same rows `deriveState` would label so. */
export function stateFilter(state: SubscriptionState, now = new Date()): Record<string, unknown> {
  const in1 = new Date(now.getTime() + DAY_MS);
  const in7 = new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY_MS);
  switch (state) {
    case "PENDING_PAYMENT":
      return { status: "PENDING_PAYMENT" };
    case "CANCELLED":
      return { status: "CANCELLED" };
    case "EXPIRED":
      return { status: { $in: ["ACTIVE", "EXPIRED"] }, expiryDate: { $lte: now } };
    case "EXPIRING_TODAY":
      return { status: "ACTIVE", expiryDate: { $gt: now, $lte: in1 } };
    case "EXPIRING_SOON":
      return { status: "ACTIVE", expiryDate: { $gt: in1, $lte: in7 } };
    case "ACTIVE":
      return { status: "ACTIVE", expiryDate: { $gt: in7 } };
  }
}

/** Adds calendar months, clamping 31 Jan + 1 month to the end of February. */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/** GST on top of a plan's listed price, worked in whole paise so no float ever reaches Razorpay. */
export function computeAmounts(priceRupees: number, gstPercent: number) {
  const base = Math.round(priceRupees * 100);
  const tax = Math.round((base * gstPercent) / 100);
  return { baseAmount: base, taxAmount: tax, totalAmount: base + tax };
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
