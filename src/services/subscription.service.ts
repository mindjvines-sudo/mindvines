import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import type { SubscriptionInput } from "@/validations/subscription.schema";
import type { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

type SubscriptionAgeGroup = (typeof SUBSCRIPTION_AGE_GROUPS)[number];

export async function listSubscriptionPlansAdmin() {
  await connectToDatabase();
  return SubscriptionPlan.find().sort({ ageGroup: 1, displayOrder: 1, createdAt: 1 }).lean();
}

export async function listPublishedSubscriptionPlans() {
  await connectToDatabase();
  return SubscriptionPlan.find({ status: "PUBLISHED" })
    .sort({ ageGroup: 1, displayOrder: 1, createdAt: 1 }).lean();
}

export async function listPublishedSubscriptionPlansForAge(ageGroup: SubscriptionAgeGroup) {
  await connectToDatabase();
  return SubscriptionPlan.find({ status: "PUBLISHED", ageGroup }).sort({ displayOrder: 1, durationMonths: 1, createdAt: 1 }).lean();
}

export async function getSubscriptionPlan(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return SubscriptionPlan.findById(id).lean();
}

/** True when another plan already has this name for the same age group and duration. */
export async function subscriptionPlanExists(input: Pick<SubscriptionInput, "name" | "ageGroup" | "durationMonths">, exceptId?: string) {
  await connectToDatabase();
  return Boolean(
    await SubscriptionPlan.exists({
      ageGroup: input.ageGroup,
      durationMonths: input.durationMonths,
      name: input.name,
      ...(exceptId && isValidObjectId(exceptId) ? { _id: { $ne: exceptId } } : {}),
    }).collation({ locale: "en", strength: 2 }),
  );
}

export async function createSubscriptionPlan(input: SubscriptionInput) {
  await connectToDatabase();
  return SubscriptionPlan.create(input);
}

export async function updateSubscriptionPlan(id: string, input: SubscriptionInput) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return SubscriptionPlan.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
}

export async function deleteSubscriptionPlan(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return SubscriptionPlan.findByIdAndDelete(id);
}
