"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { logAction } from "@/services/audit.service";
import { cancelSubscription } from "@/services/subscriber.service";

export async function cancelSubscriptionAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "subscribers")) throw new Error("You do not have permission to cancel subscriptions.");
  const cancelled = await cancelSubscription(id, `Cancelled by ${user.name}`);
  if (cancelled) await logAction({ userId: user.id, action: "UPDATE", entity: "Subscription", entityId: id, metadata: { change: "cancelled" } });
  revalidatePath("/admin/subscribers", "layout");
  revalidatePath("/admin/dashboard");
}
