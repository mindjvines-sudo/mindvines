import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { isValidObjectId, type Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { gstRatePercent } from "@/lib/gst";
import { contactMatches, normaliseReference } from "@/lib/renewal";
import { computeAmounts, deriveState } from "@/lib/subscription-status";
import { checkTopicPicks } from "@/lib/topics";
import { Programme } from "@/models/Programme";
import { Registration } from "@/models/Registration";
import { Subscription } from "@/models/Subscription";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import { applyStartedSubscriptions, RegistrationFieldError, topicsField } from "@/services/registration.service";
import { listPreferenceCategories, type PreferenceCategory } from "@/services/topic.service";
import { ageInYears } from "@/validations/registration.schema";

export class RenewalError extends Error {
  constructor(readonly code: "NOT_FOUND" | "NOT_PAID" | "ACCESS_EXPIRED" | "PLAN_UNAVAILABLE", message: string) {
    super(message);
  }
}

/** How long a parent has, after proving who they are, to choose a plan and pay. */
const ACCESS_MS = 60 * 60 * 1000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function sameHash(stored: string | null | undefined, token: string) {
  if (!stored) return false;
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(hashToken(token), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The age group a child belongs in today, from their date of birth. */
function ageGroupFor(age: number) {
  return age <= 8 ? "6-8" : "9-12";
}

/**
 * Step 1 of renewing: a parent gives the registration number and the email
 * or mobile number it was made with. A paid registration that matches gets a
 * short-lived renewal token and everything needed to choose a plan. Any
 * mismatch gets the same answer, so the form can't be used to find out which
 * registration numbers exist.
 */
export async function lookupRenewal(referenceInput: string, contact: string) {
  await connectToDatabase();
  const reference = normaliseReference(referenceInput);
  const registration = reference ? await Registration.findOne({ reference }).lean() : null;
  if (!registration?.parent || !contactMatches(contact, registration.parent)) {
    throw new RenewalError(
      "NOT_FOUND",
      "We couldn't find a registration with those details. Check the registration number and the email or mobile number you registered with."
    );
  }
  if (registration.status !== "COMPLETED") {
    throw new RenewalError("NOT_PAID", "This registration hasn't been paid for yet, so there is nothing to renew. Please finish it from the registration form, or contact us.");
  }

  const token = randomBytes(24).toString("base64url");
  await Registration.updateOne(
    { _id: registration._id },
    { $set: { renewalAccess: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ACCESS_MS) } } }
  );
  return { token, ...(await renewalOptions(registration)) };
}

type LookedUp = {
  _id: Types.ObjectId;
  reference: string;
  programmeName?: string | null;
  child?: { name: string; dob: string } | null;
  preferences?: { nickname?: string | null; selections?: { category: Types.ObjectId }[] } | null;
};

/** The child's current subscription and every published plan they can renew with, grouped for the renewal page. */
async function renewalOptions(registration: LookedUp) {
  const now = new Date();
  await applyStartedSubscriptions({ registrationId: registration._id }, now);
  const subscriptions = await Subscription.find({ registrationId: registration._id, status: { $ne: "PENDING_PAYMENT" } })
    .sort({ createdAt: -1 })
    .lean();
  const live = subscriptions
    .filter((item) => item.status === "ACTIVE" && item.expiryDate && item.expiryDate > now)
    .sort((a, b) => b.expiryDate!.getTime() - a.expiryDate!.getTime());
  // Running now vs paid and queued behind it: a new renewal goes after the last of them.
  const running = live.find((item) => !item.startDate || item.startDate <= now);
  const queued = live.filter((item) => item.startDate && item.startDate > now).sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());
  const lastEnd = live[0];
  const current = running ?? subscriptions.find((item) => !queued.includes(item)) ?? subscriptions[0] ?? null;

  const age = registration.child ? ageInYears(registration.child.dob, now) : null;
  const plans = await SubscriptionPlan.find({ status: "PUBLISHED", programme: { $ne: null } })
    .sort({ ageGroup: 1, displayOrder: 1, durationMonths: 1 })
    .lean();
  const programmes = await Programme.find({ _id: { $in: plans.map((plan) => plan.programme) }, active: true })
    .sort({ ageGroup: 1, displayOrder: 1 })
    .lean();
  const gstPercent = gstRatePercent();
  const categories = await Promise.all(programmes.map((programme) => listPreferenceCategories(programme._id)));

  return {
    registrationId: registration._id.toString(),
    reference: registration.reference,
    childName: registration.child?.name ?? "",
    age,
    nickname: registration.preferences?.nickname ?? "",
    recommendedAgeGroup: age !== null ? ageGroupFor(age) : current?.planSnapshot?.ageGroup ?? null,
    current: current
      ? {
          planId: current.plan.toString(),
          planName: current.planSnapshot?.name ?? "",
          programme: current.planSnapshot?.programme ?? registration.programmeName ?? "",
          ageGroup: current.planSnapshot?.ageGroup ?? "",
          durationMonths: current.planSnapshot?.durationMonths ?? 0,
          state: deriveState(current, now),
          startDate: current.startDate?.toISOString() ?? null,
          expiryDate: current.expiryDate?.toISOString() ?? null,
        }
      : null,
    // A renewal paid now starts when this ends, if it hasn't yet.
    runningUntil: lastEnd?.expiryDate?.toISOString() ?? null,
    upcoming: queued.map((item) => ({
      planName: item.planSnapshot?.name ?? "",
      programme: item.planSnapshot?.programme ?? "",
      durationMonths: item.planSnapshot?.durationMonths ?? 0,
      startDate: item.startDate!.toISOString(),
      expiryDate: item.expiryDate!.toISOString(),
    })),
    gstPercent,
    plans: plans.flatMap((plan) => {
      const programme = programmes.find((item) => item._id.equals(plan.programme!));
      if (!programme) return [];
      return [{
        id: plan._id.toString(),
        name: plan.name,
        ageGroup: plan.ageGroup,
        durationMonths: plan.durationMonths,
        journalCount: plan.journalCount,
        badge: plan.badge ?? "",
        featured: plan.featured,
        buttonLabel: plan.buttonLabel ?? "",
        programmeId: programme._id.toString(),
        amounts: computeAmounts(plan.price, gstPercent),
      }];
    }),
    programmes: programmes.map((programme, index) => ({
      id: programme._id.toString(),
      name: programme.name,
      ageGroup: programme.ageGroup,
      categories: categories[index].categories as PreferenceCategory[],
    })),
    chosenCategoryIds: (registration.preferences?.selections ?? []).map((selection) => selection.category.toString()),
  };
}

export type RenewalOptions = Awaited<ReturnType<typeof renewalOptions>>;

/**
 * Step 2: checks the renewal token and the chosen plan, and saves the child's
 * picks for any list in the plan's programme they haven't chosen from before
 * (renewing into a new programme). Returns what the order is made from.
 */
export async function prepareRenewal(params: { registrationId: string; token: string; planId: string; selections: Record<string, string[]> }) {
  if (!isValidObjectId(params.registrationId) || !isValidObjectId(params.planId)) {
    throw new RenewalError("ACCESS_EXPIRED", "For your security, please look up your registration again.");
  }
  const registration = await Registration.findById(params.registrationId).select("+renewalAccess.tokenHash");
  const access = registration?.renewalAccess;
  if (!registration || !access?.expiresAt || access.expiresAt < new Date() || !sameHash(access.tokenHash, params.token)) {
    throw new RenewalError("ACCESS_EXPIRED", "For your security, please look up your registration again.");
  }
  if (registration.status !== "COMPLETED") throw new RenewalError("NOT_PAID", "This registration hasn't been paid for yet.");

  const plan = await SubscriptionPlan.findOne({ _id: params.planId, status: "PUBLISHED" }).lean();
  const programme = plan?.programme ? await Programme.findOne({ _id: plan.programme, active: true }).lean() : null;
  if (!plan || !programme) throw new RenewalError("PLAN_UNAVAILABLE", "This plan is no longer available. Please choose another.");

  const chosen = new Set((registration.preferences?.selections ?? []).map((selection) => selection.category.toString()));
  const { versionId, categories } = await listPreferenceCategories(programme._id);
  const missing = categories.filter((category) => !chosen.has(category.id));

  const errors: Record<string, string[]> = {};
  for (const category of missing) {
    const problem = checkTopicPicks(params.selections[category.id] ?? [], category.topics.map((topic) => topic.id), category.required);
    if (problem) errors[topicsField(category.id)] = [problem];
  }
  if (Object.keys(errors).length > 0) throw new RegistrationFieldError(errors);

  if (missing.length > 0) {
    await Registration.updateOne(
      { _id: registration._id },
      {
        $push: {
          "preferences.selections": {
            $each: missing.map((category) => ({
              category: category.id,
              categoryName: category.name,
              topics: (params.selections[category.id] ?? []).map((id) => ({ topic: id, title: category.topics.find((topic) => topic.id === id)!.title })),
            })),
          },
        },
        ...(!registration.preferences?.topicVersion && versionId && { $set: { "preferences.topicVersion": versionId } }),
      }
    );
  }
  return { registration, plan, programmeName: programme.name };
}
