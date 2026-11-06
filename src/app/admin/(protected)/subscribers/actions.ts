"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { logAction } from "@/services/audit.service";
import { sendRenewalReminder } from "@/services/reminder.service";
import { cancelSubscription } from "@/services/subscriber.service";

export async function cancelSubscriptionAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "subscribers")) throw new Error("You do not have permission to cancel subscriptions.");
  const cancelled = await cancelSubscription(id, `Cancelled by ${user.name}`);
  if (cancelled) await logAction({ userId: user.id, action: "UPDATE", entity: "Subscription", entityId: id, metadata: { change: "cancelled" } });
  revalidatePath("/admin/subscribers", "layout");
  revalidatePath("/admin/dashboard");
}

/** Emails the parent a "renew your plan" reminder. The page shows the returned message. */
export async function sendRenewalReminderAction(id: string): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "subscribers")) return { ok: false, message: "You do not have permission to send reminders." };
  const result = await sendRenewalReminder(id);
  if (!result.ok) return result;
  await logAction({ userId: user.id, action: "UPDATE", entity: "Subscription", entityId: id, metadata: { change: "renewal reminder sent" } });
  revalidatePath("/admin/subscribers", "layout");
  return { ok: true, message: `Reminder sent to ${result.email}.` };
}
