import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { isValidObjectId, type Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { countryName, findCountry } from "@/lib/countries";
import { DRAFT_LIFETIME_DAYS, newRegistrationReference } from "@/lib/registration-status";
import { DAY_MS } from "@/lib/subscription-status";
import { checkTopicPicks } from "@/lib/topics";
import { Programme } from "@/models/Programme";
import { Registration } from "@/models/Registration";
import { Subscription } from "@/models/Subscription";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import { listPreferenceCategories } from "@/services/topic.service";
import type { RegistrationDetails, RegistrationPreferences } from "@/validations/registration.schema";

export class RegistrationError extends Error {
  constructor(readonly code: "NOT_FOUND" | "PLAN_UNAVAILABLE" | "COMPLETED", message: string) {
    super(message);
  }
}

/** Answers the server can only check once it knows the registration, keyed by form field. */
export class RegistrationFieldError extends Error {
  constructor(readonly fields: Record<string, string[]>) {
    super("Please check your details.");
  }
}

/** Topic errors are keyed by category, so the form can show each under its own list. */
export const topicsField = (categoryId: string) => `topics.${categoryId}`;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

function sameHash(stored: string | undefined, token: string) {
  if (!stored) return false;
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(hashToken(token), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

/** A browser's own unfinished registration, proven by its token. */
async function loadOwnDraft(registrationId: string, token: string) {
  if (!isValidObjectId(registrationId)) throw new RegistrationError("NOT_FOUND", "We couldn't find your registration. Please start again.");
  const registration = await Registration.findById(registrationId).select("+tokenHash");
  if (!registration || !sameHash(registration.tokenHash, token)) {
    throw new RegistrationError("NOT_FOUND", "We couldn't find your registration. Please start again.");
  }
  if (registration.status === "COMPLETED") throw new RegistrationError("COMPLETED", "This registration is already complete.");
  return registration;
}

/** Keeps when each permission was last changed: a new tick or untick is timestamped, an unchanged one keeps its time. */
function consent(given: boolean, previous: { given?: boolean | null; at?: Date | null } | null | undefined, now: Date) {
  return previous && previous.given === given && previous.at ? { given, at: previous.at } : { given, at: now };
}

/**
 * Page 1: saves the child, parent, address and permissions as a draft, or
 * updates the browser's existing draft. Returns what the browser needs to
 * carry on: the draft's id and secret token.
 */
export async function saveRegistrationDetails(params: {
  registrationId?: string;
  token?: string;
  planId: string;
  details: RegistrationDetails;
}) {
  await connectToDatabase();
  const plan = isValidObjectId(params.planId) ? await SubscriptionPlan.findOne({ _id: params.planId, status: "PUBLISHED" }).lean() : null;
  if (!plan) throw new RegistrationError("PLAN_UNAVAILABLE", "This plan is no longer available. Please choose another.");
  const programme = plan.programme ? await Programme.findById(plan.programme).select("name categories").lean() : null;

  const { details } = params;
  const phoneCountry = findCountry(details.phoneCountry)!;
  const now = new Date();
  const fields = {
    plan: plan._id,
    programme: programme?._id,
    programmeName: programme?.name ?? plan.name,
    child: { name: details.childName, dob: details.childDob, school: details.school },
    parent: {
      name: details.parentName,
      email: details.email,
      phoneCountry: phoneCountry.code,
      phoneDial: phoneCountry.dial,
      phone: details.phone,
    },
    address: {
      countryCode: details.countryCode,
      country: countryName(details.countryCode),
      line1: details.addressLine1,
      line2: details.addressLine2 || undefined,
      city: details.city,
      postalCode: details.postalCode,
    },
    expiresAt: new Date(now.getTime() + DRAFT_LIFETIME_DAYS * DAY_MS),
  };

  const existing = params.registrationId && params.token
    ? await loadOwnDraft(params.registrationId, params.token).catch((error) => {
        if (error instanceof RegistrationError && error.code === "NOT_FOUND") return null;
        throw error;
      })
    : null;

  if (existing) {
    // A different programme has different topic lists: choices from the old one no longer apply.
    const sameProgramme = String(existing.programme ?? "") === String(programme?._id ?? "");
    await Registration.updateOne(
      { _id: existing._id },
      {
        $set: {
          ...fields,
          consents: {
            terms: consent(details.acceptTerms, existing.consents?.terms, now),
            featureWork: consent(details.allowFeature, existing.consents?.featureWork, now),
            whatsappUpdates: consent(details.whatsappUpdates, existing.consents?.whatsappUpdates, now),
          },
          ...(!sameProgramme && { "preferences.selections": [], "preferences.savedAt": null }),
        },
      }
    );
    return { registrationId: existing._id.toString(), token: params.token!, reference: existing.reference };
  }

  const token = randomBytes(24).toString("base64url");
  for (let attempt = 0; ; attempt += 1) {
    try {
      const created = await Registration.create({
        ...fields,
        reference: newRegistrationReference(randomInt),
        status: "DRAFT",
        tokenHash: hashToken(token),
        consents: {
          terms: consent(details.acceptTerms, null, now),
          featureWork: consent(details.allowFeature, null, now),
          whatsappUpdates: consent(details.whatsappUpdates, null, now),
        },
      });
      return { registrationId: created._id.toString(), token, reference: created.reference };
    } catch (error) {
      // A reference already taken (vanishingly rare): draw another.
      if (isDuplicateKey(error) && attempt < 5) continue;
      throw error;
    }
  }
}

/**
 * Page 2: the nickname and favourite topics, checked against the lists of the
 * registration's programme in the live topic set: no repeats, nothing off the
 * list, exactly the number each list asks for.
 */
export async function saveRegistrationPreferences(params: { registrationId: string; token: string; preferences: RegistrationPreferences }) {
  await connectToDatabase();
  const registration = await loadOwnDraft(params.registrationId, params.token);
  const { versionId, categories } = await listPreferenceCategories(registration.programme);
  const { nickname, selections } = params.preferences;

  const errors: Record<string, string[]> = {};
  for (const category of categories) {
    const problem = checkTopicPicks(selections[category.id] ?? [], category.topics.map((topic) => topic.id), category.required);
    if (problem) errors[topicsField(category.id)] = [problem];
  }
  if (Object.keys(errors).length > 0) throw new RegistrationFieldError(errors);

  await Registration.updateOne(
    { _id: registration._id },
    {
      $set: {
        preferences: {
          nickname,
          topicVersion: versionId,
          selections: categories.map((category) => ({
            category: category.id,
            categoryName: category.name,
            topics: (selections[category.id] ?? []).map((id) => ({ topic: id, title: category.topics.find((topic) => topic.id === id)!.title })),
          })),
          savedAt: new Date(),
        },
      },
    }
  );
}

/**
 * The saved registration, ready to pay for: page 1 and page 2 both complete
 * for its programme's lists, as they stood in the topic set it was chosen
 * from. Throws a field error pointing back to page 2 otherwise.
 */
export async function loadRegistrationForPayment(registrationId: string, token: string) {
  await connectToDatabase();
  const registration = await loadOwnDraft(registrationId, token);
  const preferences = registration.preferences;
  if (!preferences?.savedAt || !preferences.nickname) {
    throw new RegistrationFieldError({ nickname: ["Please add your child's nickname and topics."] });
  }
  const { categories } = await listPreferenceCategories(registration.programme, preferences.topicVersion);
  for (const category of categories) {
    const chosen = preferences.selections?.find((selection) => selection.category.toString() === category.id);
    if (!chosen || chosen.topics.length !== category.required) {
      throw new RegistrationFieldError({ [topicsField(category.id)]: ["Please choose these topics again."] });
    }
  }
  return registration;
}

/**
 * Called once a payment is verified: the registration is final, belongs to its
 * parent, and points at this (its latest) subscription. A renewal into another
 * programme moves the registration to that programme and plan.
 */
export async function completeRegistration(
  registrationId: Types.ObjectId,
  links: { subscriber: Types.ObjectId; subscription: Types.ObjectId; plan: Types.ObjectId; programmeName?: string | null; startsNow?: boolean }
) {
  const startsNow = links.startsNow ?? true;
  const plan = await SubscriptionPlan.findById(links.plan).select("programme").lean();
  await Registration.updateOne(
    { _id: registrationId },
    {
      $set: {
        status: "COMPLETED",
        subscriber: links.subscriber,
        subscription: links.subscription,
        ...(startsNow && {
          plan: links.plan,
          ...(plan?.programme && { programme: plan.programme }),
          ...(links.programmeName && { programmeName: links.programmeName }),
        }),
      },
      $unset: { expiresAt: "" },
    }
  );
  await Registration.updateOne({ _id: registrationId, completedAt: { $exists: false } }, { $set: { completedAt: new Date() } });
}

export async function markRegistrationPaymentPending(registrationId: Types.ObjectId) {
  await Registration.updateOne({ _id: registrationId, status: "DRAFT" }, { $set: { status: "PAYMENT_PENDING" } });
}

/**
 * A queued renewal takes over its registration (plan and programme) the day it
 * starts. Run by the daily job, and when a registration is looked up, so the
 * switch is never later than the first visit after the start date.
 */
export async function applyStartedSubscriptions(filter: { registrationId?: Types.ObjectId }, now = new Date()) {
  const started = await Subscription.find({
    status: "ACTIVE",
    registrationId: filter.registrationId ?? { $ne: null },
    startDate: { $lte: now },
    expiryDate: { $gt: now },
  })
    .sort({ startDate: 1 })
    .select("registrationId plan planSnapshot.programme")
    .lean();
  // Oldest first, so when two have started the latest one wins.
  for (const item of started) {
    const plan = await SubscriptionPlan.findById(item.plan).select("programme").lean();
    await Registration.updateOne(
      { _id: item.registrationId, plan: { $ne: item.plan } },
      { $set: { plan: item.plan, ...(plan?.programme && { programme: plan.programme }), ...(item.planSnapshot?.programme && { programmeName: item.planSnapshot.programme }) } }
    );
  }
}
