import "server-only";
import { randomInt, timingSafeEqual } from "node:crypto";
import { isValidObjectId, type Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { getPagination, totalPages } from "@/lib/utils";
import {
  PILOT_UNAVAILABLE_MESSAGES,
  newAccessCode,
  normaliseAccessCode,
  normaliseEmail,
  pilotAvailability,
  reservationExpiry,
  slotsLeft,
  savingsPercent,
  pilotBadgeText,
  type PilotAvailability,
} from "@/lib/pilot";
import { Payment } from "@/models/Payment";
import { PilotPlan } from "@/models/PilotPlan";
import { PilotRegistration } from "@/models/PilotRegistration";
import { Subscription } from "@/models/Subscription";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import { Programme } from "@/models/Programme";
import type { PilotPlanInput } from "@/validations/pilot.schema";

export class PilotError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "UNAVAILABLE" | "NOT_ELIGIBLE" | "DUPLICATE" | "ALREADY_REGISTERED" | "CODE_TAKEN" | "LIMIT_TOO_LOW",
    message: string
  ) {
    super(message);
  }
}

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

function sameCode(stored: string | null | undefined, given: string | null | undefined) {
  const a = Buffer.from(normaliseAccessCode(stored));
  const b = Buffer.from(normaliseAccessCode(given));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

/** The plan fields a visitor may see. Never the access code, the approved emails or the counters' internals. */
export type PublicPilotPlan = Awaited<ReturnType<typeof toPublicPlan>>;

async function toPublicPlan(plan: {
  _id: Types.ObjectId;
  name: string;
  description?: string | null;
  badgeEnabled?: boolean | null;
  badgeText?: string | null;
  basePlan: Types.ObjectId;
  durationMonths: number;
  originalPrice: number;
  offerPrice: number;
  maxRegistrations: number;
  registrationCount: number;
  reservedCount?: number | null;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "INACTIVE";
  termsAndConditions?: string | null;
  eligibilityType: string;
}) {
  const base = await SubscriptionPlan.findById(plan.basePlan, "ageGroup journalCount programme").lean();
  const programme = base?.programme ? await Programme.findById(base.programme, "name").lean() : null;
  return {
    id: plan._id.toString(),
    name: plan.name,
    description: plan.description ?? "",
    durationMonths: plan.durationMonths,
    originalPrice: plan.originalPrice,
    offerPrice: plan.offerPrice,
    savingsPercent: savingsPercent(plan.originalPrice, plan.offerPrice),
    badgeText: pilotBadgeText(plan),
    slotsLeft: slotsLeft(plan),
    maxRegistrations: plan.maxRegistrations,
    availability: pilotAvailability(plan) as PilotAvailability,
    startDate: plan.startDate.toISOString(),
    endDate: plan.endDate.toISOString(),
    terms: plan.termsAndConditions ?? "",
    restricted: plan.eligibilityType !== "PUBLIC",
    ageGroup: base?.ageGroup ?? "",
    journalCount: base?.journalCount ?? 0,
    programmeName: programme?.name ?? "",
  };
}

/**
 * Plans anyone may see: active, public, inside their registration window.
 * Fully booked plans are included (marked so) so families see why they can't
 * join; inactive, expired and restricted plans are never returned.
 */
export async function listPublicPilotPlans(now = new Date()) {
  await connectToDatabase();
  const plans = await PilotPlan.find({ status: "ACTIVE", eligibilityType: "PUBLIC", startDate: { $lte: now }, endDate: { $gte: now } })
    .sort({ durationMonths: 1, offerPrice: 1 })
    .lean();
  return Promise.all(plans.map(toPublicPlan));
}

/** The restricted plan an access code opens, if it is active and inside its window. */
export async function findPilotPlanByCode(code: string, now = new Date()) {
  const normalised = normaliseAccessCode(code);
  if (normalised.length < 4 || normalised.length > 32) return null;
  await connectToDatabase();
  const plan = await PilotPlan.findOne({ accessCode: normalised, eligibilityType: { $ne: "PUBLIC" }, status: "ACTIVE", startDate: { $lte: now }, endDate: { $gte: now } }).lean();
  return plan ? toPublicPlan(plan) : null;
}

type EligibilityPlan = {
  eligibilityType: "PUBLIC" | "ACCESS_CODE" | "EMAIL_LIST";
  accessCode?: string | null;
  allowedEmails?: string[] | null;
  status: "ACTIVE" | "INACTIVE";
  startDate: Date;
  endDate: Date;
  maxRegistrations: number;
  registrationCount: number;
  reservedCount?: number | null;
};

/**
 * Throws unless this plan may take a registration from this visitor right
 * now. `code` is checked for restricted plans when given `requireCode`
 * (opening the form and saving details); the email list is checked whenever
 * an email is known. The slot count is checked here for a clear message, but
 * it is `reservePilotSlot` that actually enforces it.
 */
export function assertPilotEligible(plan: EligibilityPlan, check: { code?: string | null; email?: string | null; requireCode?: boolean }, now = new Date()) {
  const availability = pilotAvailability(plan, now);
  if (availability !== "OPEN") throw new PilotError("UNAVAILABLE", PILOT_UNAVAILABLE_MESSAGES[availability]);
  if (plan.eligibilityType !== "PUBLIC" && check.requireCode && !sameCode(plan.accessCode, check.code)) {
    // The same wording as a missing plan: a wrong code never confirms that a plan exists.
    throw new PilotError("NOT_ELIGIBLE", "This pilot plan is not available.");
  }
  if (plan.eligibilityType === "EMAIL_LIST" && check.email !== undefined) {
    const allowed = (plan.allowedEmails ?? []).map(normaliseEmail);
    if (!check.email || !allowed.includes(normaliseEmail(check.email))) {
      throw new PilotError("NOT_ELIGIBLE", "This pilot offer is open to invited families only. Please use the email address you were invited with.");
    }
  }
}

export async function getPilotPlan(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return PilotPlan.findById(id).lean();
}

/** A plan a visitor is allowed to open, or null (not found, inactive, closed, or the wrong code). Full plans are returned so the page can say so. */
export async function getPilotPlanForVisitor(id: string, code?: string | null, now = new Date()) {
  const plan = await getPilotPlan(id);
  if (!plan || plan.status !== "ACTIVE" || now < plan.startDate || now > plan.endDate) return null;
  if (plan.eligibilityType !== "PUBLIC" && !sameCode(plan.accessCode, code)) return null;
  return plan;
}

// ---------------------------------------------------------------------------
// Slot reservation. Every change to a plan's counters is one atomic update
// guarded by a condition, and every reservation changes state with a
// findOneAndUpdate that only one caller can win, so a counter moves exactly
// once per transition however many requests race.
// ---------------------------------------------------------------------------

const HAS_ROOM = { $expr: { $lt: [{ $add: ["$registrationCount", "$reservedCount"] }, "$maxRegistrations"] } };

/** Gives expired holds back, unless their payment is still being confirmed (then they are held a little longer). */
export async function releaseExpiredReservations(pilotPlanId?: Types.ObjectId | string, now = new Date()) {
  const expired = await PilotRegistration.find({ status: "RESERVED", reservedUntil: { $lte: now }, ...(pilotPlanId && { pilotPlan: pilotPlanId }) }, "subscription").limit(200).lean();
  let released = 0;
  for (const hold of expired) {
    const payment = hold.subscription ? await Payment.findOne({ subscription: hold.subscription, status: "PENDING" }, "_id").lean() : null;
    if (payment) {
      await PilotRegistration.updateOne({ _id: hold._id, status: "RESERVED" }, { $set: { reservedUntil: reservationExpiry(now) } });
      continue;
    }
    const gone = await PilotRegistration.findOneAndUpdate(
      { _id: hold._id, status: "RESERVED", reservedUntil: { $lte: now } },
      { $set: { status: "RELEASED", releasedAt: now, releaseReason: "Payment not completed in time" } }
    );
    if (gone) {
      await PilotPlan.updateOne({ _id: gone.pilotPlan, reservedCount: { $gt: 0 } }, { $inc: { reservedCount: -1 } });
      released += 1;
    }
  }
  return released;
}

/**
 * Holds one slot of a pilot plan for a registration while its family pays.
 * Safe to call again for the same registration (it only extends the hold) and
 * to call from many requests at once: the plan's counter is raised by a single
 * conditional update, and a registration can own only one reservation.
 */
export async function reservePilotSlot(params: { registrationId: Types.ObjectId; pilotPlanId: Types.ObjectId | string; email: string; code?: string | null; requireCode?: boolean }) {
  await connectToDatabase();
  const now = new Date();
  const email = normaliseEmail(params.email);
  await releaseExpiredReservations(params.pilotPlanId, now);

  const plan = await PilotPlan.findById(params.pilotPlanId).lean();
  if (!plan) throw new PilotError("NOT_FOUND", "This pilot plan is no longer available.");

  // A registration that switched to another pilot plan gives the old slot back first.
  await releasePilotReservation(params.registrationId, "Switched plan", { exceptPlan: plan._id });

  const mine = await PilotRegistration.findOne({ registration: params.registrationId }).lean();
  if (mine?.status === "CONFIRMED" || mine?.status === "REFUND_REQUIRED") {
    throw new PilotError("ALREADY_REGISTERED", "This child is already registered for a pilot plan.");
  }

  // Eligibility is judged before any slot is touched. A hold this registration already owns is simply extended.
  assertPilotEligibleIgnoringFull(plan, { code: params.code, email, requireCode: params.requireCode }, now, mine?.status === "RESERVED" && mine.pilotPlan.equals(plan._id));

  if (mine?.status === "RESERVED" && mine.pilotPlan.equals(plan._id)) {
    const extended = await PilotRegistration.findOneAndUpdate({ _id: mine._id, status: "RESERVED" }, { $set: { reservedUntil: reservationExpiry(now), email } });
    if (extended) return;
  }

  if (plan.maxPerEmail > 0) {
    const held = await PilotRegistration.countDocuments({
      pilotPlan: plan._id,
      email,
      registration: { $ne: params.registrationId },
      $or: [{ status: { $in: ["CONFIRMED", "REFUND_REQUIRED"] } }, { status: "RESERVED", reservedUntil: { $gt: now } }],
    });
    if (held >= plan.maxPerEmail) {
      throw new PilotError("DUPLICATE", plan.maxPerEmail === 1 ? "This email address has already registered for this pilot plan." : `This email address has already used its ${plan.maxPerEmail} places in this pilot plan.`);
    }
  }

  // Step 1: become the one request that owns this registration's hold. Only one racing request can flip the
  // record to RESERVED; the others find it already held and just extend it, so a double click never competes with itself for places.
  let created = false;
  try {
    const before = await PilotRegistration.findOneAndUpdate(
      { registration: params.registrationId, status: "RELEASED" },
      {
        $set: { pilotPlan: plan._id, email, status: "RESERVED", reservedUntil: reservationExpiry(now), planName: plan.name, registrationDate: now },
        $unset: { releasedAt: "", releaseReason: "", subscription: "" },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    created = !before;
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const current = await PilotRegistration.findOne({ registration: params.registrationId }).lean();
    if (current?.status === "RESERVED" && current.pilotPlan.equals(plan._id)) {
      await PilotRegistration.updateOne({ _id: current._id, status: "RESERVED" }, { $set: { reservedUntil: reservationExpiry(now), email } });
      return;
    }
    throw new PilotError("ALREADY_REGISTERED", "This child is already registered for a pilot plan.");
  }

  // Step 2: take the place itself with one conditional increment. This is what enforces the limit: it cannot succeed
  // when confirmed + held places have reached the maximum, however many requests arrive together.
  const claimed = await PilotPlan.findOneAndUpdate(
    { _id: plan._id, status: "ACTIVE", startDate: { $lte: now }, endDate: { $gte: now }, ...HAS_ROOM },
    { $inc: { reservedCount: 1 } },
    { returnDocument: "after", projection: "_id" }
  );
  if (!claimed) {
    // No room after all: undo step 1, so the record never claims a place the plan didn't give.
    if (created) await PilotRegistration.deleteOne({ registration: params.registrationId, status: "RESERVED", pilotPlan: plan._id });
    else await PilotRegistration.updateOne({ registration: params.registrationId, status: "RESERVED", pilotPlan: plan._id }, { $set: { status: "RELEASED", releasedAt: now, releaseReason: "No place available" }, $unset: { reservedUntil: "" } });
    const fresh = await PilotPlan.findById(plan._id).lean();
    const why = fresh ? pilotAvailability(fresh, now) : "INACTIVE";
    throw new PilotError("UNAVAILABLE", PILOT_UNAVAILABLE_MESSAGES[why === "OPEN" ? "FULLY_BOOKED" : why]);
  }
}

/** Like assertPilotEligible, but a full plan is not a reason to refuse a family that already holds one of its slots. */
function assertPilotEligibleIgnoringFull(plan: EligibilityPlan, check: { code?: string | null; email?: string | null; requireCode?: boolean }, now: Date, holdsSlot: boolean) {
  if (holdsSlot) assertPilotEligible({ ...plan, maxRegistrations: plan.maxRegistrations + 1 }, check, now);
  else assertPilotEligible(plan, check, now);
}

/** Gives a registration's held slot back (payment cancelled, plan switched). Does nothing once it is confirmed. */
export async function releasePilotReservation(registrationId: Types.ObjectId | string, reason: string, options: { exceptPlan?: Types.ObjectId } = {}) {
  await connectToDatabase();
  const now = new Date();
  const gone = await PilotRegistration.findOneAndUpdate(
    { registration: registrationId, status: "RESERVED", ...(options.exceptPlan && { pilotPlan: { $ne: options.exceptPlan } }) },
    { $set: { status: "RELEASED", releasedAt: now, releaseReason: reason.slice(0, 200) }, $unset: { reservedUntil: "" } }
  );
  if (gone) await PilotPlan.updateOne({ _id: gone.pilotPlan, reservedCount: { $gt: 0 } }, { $inc: { reservedCount: -1 } });
  return Boolean(gone);
}

/** Remembers which subscription a held slot is paying for, so a payment can find it again. */
export async function linkPilotSubscription(registrationId: Types.ObjectId, subscriptionId: Types.ObjectId, payment?: { amount: number; razorpayOrderId: string }) {
  await PilotRegistration.updateOne(
    { registration: registrationId, status: "RESERVED" },
    { $set: { subscription: subscriptionId, ...(payment && { amount: payment.amount, paymentReference: payment.razorpayOrderId }) } }
  );
}

/**
 * Called when a pilot payment is verified, before the subscription is
 * activated. Turns the hold into a confirmed place. If the hold had already
 * lapsed (a very late payment) the slot is taken again if one is free;
 * otherwise the registration is flagged REFUND_REQUIRED and `false` is
 * returned so the subscription is not activated beyond the plan's limit.
 * Safe to call any number of times for the same payment.
 */
export async function confirmPilotSlot(subscriptionId: Types.ObjectId, paid: { amount: number; paymentReference?: string | null }, dates: { start: Date; expiry: Date; subscriber?: Types.ObjectId }) {
  await connectToDatabase();
  const now = new Date();
  const record = await PilotRegistration.findOne({ subscription: subscriptionId });
  if (!record) return false;
  if (record.status === "CONFIRMED") return true;
  if (record.status === "REFUND_REQUIRED" || record.status === "CANCELLED") return false;

  const confirmedFields = {
    status: "CONFIRMED" as const,
    confirmedAt: now,
    paymentStatus: "PAID" as const,
    amount: paid.amount,
    paymentReference: paid.paymentReference ?? record.paymentReference,
    subscriptionStartDate: dates.start,
    subscriptionExpiryDate: dates.expiry,
    ...(dates.subscriber && { user: dates.subscriber }),
  };

  if (record.status === "RESERVED") {
    const won = await PilotRegistration.findOneAndUpdate({ _id: record._id, status: "RESERVED" }, { $set: confirmedFields, $unset: { reservedUntil: "" } });
    if (won) {
      await PilotPlan.updateOne({ _id: record.pilotPlan }, { $inc: { reservedCount: -1, registrationCount: 1 } });
      return true;
    }
    const current = await PilotRegistration.findById(record._id).lean();
    return current?.status === "CONFIRMED";
  }

  // RELEASED: the hold lapsed before the money arrived. Take a place again if there is one.
  const reclaimed = await PilotPlan.findOneAndUpdate({ _id: record.pilotPlan, ...HAS_ROOM }, { $inc: { registrationCount: 1 } }, { projection: "_id" });
  if (!reclaimed) {
    await PilotRegistration.updateOne(
      { _id: record._id, status: "RELEASED" },
      { $set: { status: "REFUND_REQUIRED", paymentStatus: "PAID", amount: paid.amount, paymentReference: paid.paymentReference ?? record.paymentReference, releaseReason: "Paid after the plan filled up" } }
    );
    return false;
  }
  const won = await PilotRegistration.findOneAndUpdate({ _id: record._id, status: "RELEASED" }, { $set: confirmedFields, $unset: { releasedAt: "", releaseReason: "" } });
  if (!won) {
    await PilotPlan.updateOne({ _id: record.pilotPlan, registrationCount: { $gt: 0 } }, { $inc: { registrationCount: -1 } });
    const current = await PilotRegistration.findById(record._id).lean();
    return current?.status === "CONFIRMED";
  }
  return true;
}

/** A confirmed place is given back when its subscription is cancelled or its payment refunded: the slot opens again. */
export async function cancelPilotPlace(subscriptionId: Types.ObjectId | string, reason: "cancelled" | "refunded") {
  await connectToDatabase();
  const gone = await PilotRegistration.findOneAndUpdate(
    { subscription: subscriptionId, status: { $in: ["CONFIRMED", "REFUND_REQUIRED"] } },
    { $set: { status: "CANCELLED", releasedAt: new Date(), releaseReason: reason, ...(reason === "refunded" && { paymentStatus: "REFUNDED" }) } },
    { projection: "pilotPlan status" }
  );
  // Only a confirmed place was ever counted; a REFUND_REQUIRED one never took a slot.
  if (gone?.status === "CONFIRMED") await PilotPlan.updateOne({ _id: gone.pilotPlan, registrationCount: { $gt: 0 } }, { $inc: { registrationCount: -1 } });
  return Boolean(gone);
}

/** A payment the family walked away from: if it was a pilot's, its held slot goes back. A payment that is paid or being confirmed keeps its slot. */
export async function releasePilotHoldForOrder(razorpayOrderId: string) {
  await connectToDatabase();
  const payment = await Payment.findOne({ razorpayOrderId }, "subscription status").lean();
  if (!payment || payment.status === "PAID" || payment.status === "PENDING") return false;
  const subscription = await Subscription.findOne({ _id: payment.subscription, subscriptionType: "PILOT" }, "registrationId").lean();
  return subscription?.registrationId ? releasePilotReservation(subscription.registrationId, "Payment cancelled") : false;
}

/** A full refund reported by the payment gateway: the pilot subscription ends and its slot reopens. Standard subscriptions are never touched here. */
export async function handlePilotRefund(razorpayOrderId: string) {
  await connectToDatabase();
  const payment = await Payment.findOne({ razorpayOrderId }, "subscription").lean();
  if (!payment) return false;
  const subscription = await Subscription.findOne({ _id: payment.subscription, subscriptionType: "PILOT" }, "_id").lean();
  if (!subscription) return false;
  await Subscription.updateOne(
    { _id: subscription._id, status: { $in: ["ACTIVE", "PENDING_PAYMENT"] } },
    { $set: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Payment refunded" } }
  );
  return cancelPilotPlace(subscription._id, "refunded");
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

async function uniqueCode(exceptId?: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = newAccessCode(randomInt);
    if (!(await PilotPlan.exists({ accessCode: code, ...(exceptId && { _id: { $ne: exceptId } }) }))) return code;
  }
  throw new PilotError("CODE_TAKEN", "Could not create an access code. Please try again.");
}

function planFields(input: PilotPlanInput) {
  return {
    name: input.name,
    description: input.description,
    badgeEnabled: input.badgeEnabled,
    badgeText: input.badgeText,
    basePlan: input.basePlan,
    duration: input.duration,
    customDuration: input.duration === "CUSTOM" ? input.customDuration : null,
    durationMonths: input.durationMonths,
    originalPrice: input.originalPrice,
    discountType: input.discountType,
    discountValue: input.discountValue,
    offerPrice: input.offerPrice,
    maxRegistrations: input.maxRegistrations,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    eligibilityType: input.eligibilityType,
    allowedEmails: input.eligibilityType === "EMAIL_LIST" ? input.allowedEmails : [],
    maxPerEmail: input.maxPerEmail,
    termsAndConditions: input.termsAndConditions,
  };
}

export async function createPilotPlan(input: PilotPlanInput, userId: string) {
  await connectToDatabase();
  if (!(await SubscriptionPlan.exists({ _id: input.basePlan }))) throw new PilotError("NOT_FOUND", "Choose a plan from the list.");
  const restricted = input.eligibilityType !== "PUBLIC";
  const code = restricted ? normaliseAccessCode(input.accessCode) || (await uniqueCode()) : undefined;
  try {
    return await PilotPlan.create({ ...planFields(input), accessCode: code, createdBy: userId, updatedBy: userId });
  } catch (error) {
    if (isDuplicateKey(error)) throw new PilotError("CODE_TAKEN", "This access code is already used by another pilot plan.");
    throw error;
  }
}

export async function updatePilotPlan(id: string, input: PilotPlanInput, userId: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  if (!(await SubscriptionPlan.exists({ _id: input.basePlan }))) throw new PilotError("NOT_FOUND", "Choose a plan from the list.");
  const existing = await PilotPlan.findById(id).lean();
  if (!existing) return null;
  const restricted = input.eligibilityType !== "PUBLIC";
  const code = restricted ? normaliseAccessCode(input.accessCode) || existing.accessCode || (await uniqueCode(id)) : undefined;
  try {
    // The limit can never be set below the places already taken or held; the guard is in the update itself, so a registration landing at the same moment can't slip under it.
    const updated = await PilotPlan.findOneAndUpdate(
      {
        _id: id,
        $expr: { $lte: [{ $add: ["$registrationCount", "$reservedCount"] }, input.maxRegistrations] },
      },
      { $set: { ...planFields(input), updatedBy: userId, ...(code ? { accessCode: code } : {}) }, ...(code ? {} : { $unset: { accessCode: "" } }) },
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) throw new PilotError("LIMIT_TOO_LOW", `The maximum can't be lower than the ${existing.registrationCount + existing.reservedCount} places already taken or held.`);
    return updated;
  } catch (error) {
    if (isDuplicateKey(error)) throw new PilotError("CODE_TAKEN", "This access code is already used by another pilot plan.");
    throw error;
  }
}

export async function setPilotPlanStatus(id: string, status: "ACTIVE" | "INACTIVE", userId: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return PilotPlan.findByIdAndUpdate(id, { $set: { status, updatedBy: userId } }, { returnDocument: "after" });
}

export async function listPilotPlansAdmin() {
  await connectToDatabase();
  await releaseExpiredReservations();
  const now = new Date();
  const plans = await PilotPlan.find().sort({ createdAt: -1 }).limit(200).lean();
  const revenue = await PilotRegistration.aggregate<{ _id: unknown; revenue: number }>([
    { $match: { status: "CONFIRMED", paymentStatus: "PAID" } },
    { $group: { _id: "$pilotPlan", revenue: { $sum: "$amount" } } },
  ]);
  const revenueByPlan = new Map(revenue.map((row) => [String(row._id), row.revenue]));
  const items = plans.map((plan) => ({
    ...plan,
    availability: pilotAvailability(plan, now),
    slotsLeft: slotsLeft(plan),
    revenue: revenueByPlan.get(plan._id.toString()) ?? 0,
  }));
  return {
    items,
    summary: {
      totalPlans: items.length,
      activePlans: items.filter((plan) => plan.status === "ACTIVE").length,
      totalRegistrations: items.reduce((sum, plan) => sum + plan.registrationCount, 0),
      pendingPayments: items.reduce((sum, plan) => sum + (plan.reservedCount ?? 0), 0),
      availableSlots: items.filter((plan) => plan.availability === "OPEN").reduce((sum, plan) => sum + plan.slotsLeft, 0),
      fullyBooked: items.filter((plan) => plan.availability === "FULLY_BOOKED").length,
      revenue: items.reduce((sum, plan) => sum + plan.revenue, 0),
    },
  };
}

export type PilotRegistrationFilters = { status?: string; search?: string; page?: string | number };

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One pilot plan's registrations, with each one's subscription and payment for the admin's table. */
export async function listPilotRegistrations(pilotPlanId: string, filters: PilotRegistrationFilters = {}, options: { all?: boolean } = {}) {
  if (!isValidObjectId(pilotPlanId)) return null;
  await connectToDatabase();
  const plan = await PilotPlan.findById(pilotPlanId).lean();
  if (!plan) return null;
  const query: Record<string, unknown> = { pilotPlan: plan._id };
  if (filters.status && ["RESERVED", "CONFIRMED", "RELEASED", "CANCELLED", "REFUND_REQUIRED"].includes(filters.status)) query.status = filters.status;
  if (filters.search) query.email = { $regex: escapeRegex(filters.search.trim().slice(0, 80)), $options: "i" };
  const { page, limit, skip } = getPagination({ page: filters.page });
  const cursor = PilotRegistration.find(query).sort({ registrationDate: -1 });
  const [rows, total] = await Promise.all([options.all ? cursor.limit(5000).lean() : cursor.skip(skip).limit(limit).lean(), PilotRegistration.countDocuments(query)]);

  const subscriptions = await Subscription.find({ _id: { $in: rows.flatMap((row) => (row.subscription ? [row.subscription] : [])) } }, "reference status registration.childName registration.name registration.phone startDate expiryDate").lean();
  const bySubscription = new Map(subscriptions.map((item) => [item._id.toString(), item]));
  const items = rows.map((row) => ({ ...row, subscriptionDoc: row.subscription ? bySubscription.get(row.subscription.toString()) : undefined }));
  return { plan, items, page, limit, total, pages: totalPages(total, limit) };
}

export async function listBasePlanOptions() {
  await connectToDatabase();
  return SubscriptionPlan.find({ status: "PUBLISHED" }, "name ageGroup durationMonths").sort({ ageGroup: 1, durationMonths: 1 }).lean();
}
