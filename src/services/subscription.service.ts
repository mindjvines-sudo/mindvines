import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getPagination, totalPages } from "@/lib/utils";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import type { SubscriptionInput } from "@/validations/subscription.schema";
import type { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

type SubscriptionAgeGroup = (typeof SUBSCRIPTION_AGE_GROUPS)[number];

/** One page of plans, filtered in the database; the counts and duration choices come from separate cheap queries. */
export async function listSubscriptionPlansAdmin(params: { page?: string | number; ageGroup?: string; duration?: number; status?: string } = {}) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const filter: Record<string, string | number> = {
    ...(params.ageGroup && { ageGroup: params.ageGroup }),
    ...(params.duration && { durationMonths: params.duration }),
    ...(params.status && { status: params.status }),
  };
  const [items, total, durations, overall] = await Promise.all([
    SubscriptionPlan.find(filter).sort({ ageGroup: 1, displayOrder: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
    SubscriptionPlan.countDocuments(filter),
    SubscriptionPlan.distinct("durationMonths") as Promise<number[]>,
    SubscriptionPlan.estimatedDocumentCount(),
  ]);
  return { items, page, limit, total, pages: totalPages(total, limit), durations: durations.sort((a, b) => a - b), overall };
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
