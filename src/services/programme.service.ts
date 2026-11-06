import "server-only";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import type { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";
import { getPagination, totalPages } from "@/lib/utils";
import { Programme } from "@/models/Programme";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import type { ProgrammeInput } from "@/validations/programme.schema";

type AgeGroup = (typeof SUBSCRIPTION_AGE_GROUPS)[number];

export async function listProgrammesAdmin(params: { page?: string | number } = {}) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const [programmes, total] = await Promise.all([
    Programme.find().sort({ ageGroup: 1, displayOrder: 1, createdAt: 1 }).skip(skip).limit(limit).populate<{ categories: { _id: unknown; name: string }[] }>("categories", "name").lean(),
    Programme.estimatedDocumentCount(),
  ]);
  // Plan counts only for the programmes on this page.
  const planCounts = await SubscriptionPlan.aggregate<{ _id: unknown; count: number }>([
    { $match: { programme: { $in: programmes.map((programme) => programme._id) } } },
    { $group: { _id: "$programme", count: { $sum: 1 } } },
  ]);
  const counts = new Map(planCounts.map((row) => [String(row._id), row.count]));
  return {
    items: programmes.map((programme) => ({ ...programme, planCount: counts.get(programme._id.toString()) ?? 0 })),
    page, limit, total, pages: totalPages(total, limit),
  };
}

export async function listProgrammeOptions() {
  await connectToDatabase();
  return Programme.find().select("name ageGroup active").sort({ ageGroup: 1, displayOrder: 1 }).lean();
}

export async function getProgramme(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return Programme.findById(id).lean();
}

export async function createProgramme(input: ProgrammeInput) {
  await connectToDatabase();
  return Programme.create(input);
}

export async function updateProgramme(id: string, input: ProgrammeInput) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return Programme.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
}

/** A programme with plans can't be deleted: its plans and past registrations point at it. Switch it off instead. */
export async function deleteProgramme(id: string): Promise<"deleted" | "in-use" | "missing"> {
  if (!isValidObjectId(id)) return "missing";
  await connectToDatabase();
  if ((await SubscriptionPlan.countDocuments({ programme: id })) > 0) return "in-use";
  return (await Programme.findByIdAndDelete(id)) ? "deleted" : "missing";
}

/**
 * The Programme choices in the registration form: this age group's active
 * programmes that have a published plan of the same length, each with that
 * plan, so choosing one switches to it.
 */
export async function listProgrammeChoices(ageGroup: AgeGroup, durationMonths: number) {
  await connectToDatabase();
  const plans = await SubscriptionPlan.find({ status: "PUBLISHED", ageGroup, durationMonths, programme: { $ne: null } })
    .select("programme displayOrder")
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  const programmes = await Programme.find({ _id: { $in: plans.map((plan) => plan.programme) }, active: true })
    .sort({ displayOrder: 1 })
    .lean();
  return programmes.flatMap((programme) => {
    const plan = plans.find((item) => item.programme?.equals(programme._id));
    return plan ? [{ programmeId: programme._id.toString(), name: programme.name, planId: plan._id.toString() }] : [];
  });
}
