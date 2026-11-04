export const SUBSCRIPTION_AGE_GROUPS = ["6-8", "9-12"] as const;

export function formatPlanPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price);
}
