"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { subscriptionInputSchema, type SubscriptionInput } from "@/validations/subscription.schema";
import * as subscriptions from "@/services/subscription.service";
import { logAction } from "@/services/audit.service";

export type SubscriptionFormState = {
  errors?: Partial<Record<keyof SubscriptionInput, string[]>>;
  message?: string;
} | undefined;

function parseInput(formData: FormData) {
  return subscriptionInputSchema.safeParse({
    ...Object.fromEntries(formData),
    featured: formData.get("featured") === "on",
    features: String(formData.get("features") ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  });
}

function revalidatePlans() {
  revalidatePath("/admin/subscriptions", "layout");
  revalidatePath("/subscriptions");
  revalidatePath("/");
}

export async function createSubscriptionAction(_prev: SubscriptionFormState, formData: FormData): Promise<SubscriptionFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "subscriptions")) return { message: "You do not have permission to create subscription plans." };
  const result = parseInput(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  if (result.data.status === "PUBLISHED" && !can(user.role, "publish", "subscriptions")) {
    return { message: "You do not have permission to publish subscription plans." };
  }
  if (await subscriptions.subscriptionPlanExists(result.data)) {
    return { errors: { name: ["A plan with this name already exists for this age group and duration."] } };
  }
  try {
    const plan = await subscriptions.createSubscriptionPlan(result.data);
    await logAction({ userId: user.id, action: "CREATE", entity: "SubscriptionPlan", entityId: plan._id.toString() });
  } catch {
    return { message: "Unable to save the subscription plan. Please try again." };
  }
  revalidatePlans();
  redirect("/admin/subscriptions");
}

export async function updateSubscriptionAction(id: string, _prev: SubscriptionFormState, formData: FormData): Promise<SubscriptionFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "subscriptions")) return { message: "You do not have permission to edit subscription plans." };
  const result = parseInput(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  if (result.data.status === "PUBLISHED" && !can(user.role, "publish", "subscriptions")) {
    return { message: "You do not have permission to publish subscription plans." };
  }
  if (await subscriptions.subscriptionPlanExists(result.data, id)) {
    return { errors: { name: ["A plan with this name already exists for this age group and duration."] } };
  }
  try {
    const plan = await subscriptions.updateSubscriptionPlan(id, result.data);
    if (!plan) return { message: "This subscription plan no longer exists." };
    await logAction({ userId: user.id, action: "UPDATE", entity: "SubscriptionPlan", entityId: id });
  } catch {
    return { message: "Unable to save the subscription plan. Please try again." };
  }
  revalidatePlans();
  redirect("/admin/subscriptions");
}

export async function deleteSubscriptionAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "subscriptions")) throw new Error("You do not have permission to delete subscription plans.");
  const plan = await subscriptions.deleteSubscriptionPlan(id);
  if (plan) await logAction({ userId: user.id, action: "DELETE", entity: "SubscriptionPlan", entityId: id });
  revalidatePlans();
}
