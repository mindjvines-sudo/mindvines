import { DAY_MS } from "@/lib/subscription-status";

/** A renewal reminder can be sent this many days before a subscription ends. */
export const REMINDER_WINDOW_DAYS = 10;

/**
 * Whether the admin should be offered "Send renewal reminder": the
 * subscription is running, ends within the window, and the family hasn't
 * already paid for a later one (nothing to remind them about).
 */
export function renewalReminderDue(
  subscription: { status: string; startDate?: Date | string | null; expiryDate?: Date | string | null },
  laterExpiryDates: (Date | string | null | undefined)[],
  now = new Date()
) {
  if (subscription.status !== "ACTIVE" || !subscription.expiryDate) return false;
  const expiry = new Date(subscription.expiryDate).getTime();
  if (expiry <= now.getTime() || expiry > now.getTime() + REMINDER_WINDOW_DAYS * DAY_MS) return false;
  if (subscription.startDate && new Date(subscription.startDate) > now) return false;
  return !laterExpiryDates.some((date) => date && new Date(date).getTime() > expiry);
}
