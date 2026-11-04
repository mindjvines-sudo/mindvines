import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import type { SubscriptionInput } from "@/validations/subscription.schema";

export async function listSubscriptionPlansAdmin() {
  await connectToDatabase();
  return SubscriptionPlan.find().sort({ ageGroup: 1, displayOrder: 1, createdAt: 1 }).lean();
}

export async function listPublishedSubscriptionPlans() {
  await connectToDatabase();
  return SubscriptionPlan.find({ status: "PUBLISHED" })
    .sort({ ageGroup: 1, displayOrder: 1, createdAt: 1 }).lean();
}

export async function getSubscriptionPlan(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return SubscriptionPlan.findById(id).lean();
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
