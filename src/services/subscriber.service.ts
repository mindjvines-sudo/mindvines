import "server-only";
import { isValidObjectId, type Types } from "mongoose";
import { renewalReminderDue } from "@/lib/renewal-reminder";
import { connectToDatabase } from "@/lib/mongodb";
import { getPagination, totalPages } from "@/lib/utils";
import {
  PAYMENT_STATUSES,
  SUBSCRIPTION_STATES,
  deriveState,
  remainingDays,
  stateFilter,
  type PaymentStatus,
  type SubscriptionState,
} from "@/lib/subscription-status";
import { Payment } from "@/models/Payment";
import { Registration } from "@/models/Registration";
import { Subscriber } from "@/models/Subscriber";
import { Subscription } from "@/models/Subscription";

/** How the registration list can be ordered. */
export const SORTS = {
  newest: { label: "Newest registrations first", order: { createdAt: -1 } },
  oldest: { label: "Oldest registrations first", order: { createdAt: 1 } },
  expiry: { label: "Expiring soonest first", order: { expiryDate: 1, createdAt: -1 } },
  child: { label: "Child's name, A–Z", order: { "registration.childName": 1, createdAt: -1 } },
  parent: { label: "Parent's name, A–Z", order: { "registration.name": 1, createdAt: -1 } },
} as const;
export type SubscriptionSort = keyof typeof SORTS;

export type SubscriptionFilters = {
  search?: string;
  plan?: string;
  programme?: string;
  state?: SubscriptionState;
  payment?: PaymentStatus;
  school?: string;
  country?: string;
  registeredFrom?: string;
  registeredTo?: string;
  startFrom?: string;
  startTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
  sort?: SubscriptionSort;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EXPORT_ROWS = 5000;

/** Reads the filters out of a URL's query, ignoring anything that isn't a known value. */
export function parseSubscriptionFilters(params: Record<string, string | undefined>): SubscriptionFilters {
  const date = (value?: string) => (value && DATE.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined);
  return {
    search: params.search?.trim().slice(0, 80) || undefined,
    plan: params.plan && isValidObjectId(params.plan) ? params.plan : undefined,
    programme: params.programme?.trim().slice(0, 80) || undefined,
    state: SUBSCRIPTION_STATES.find((state) => state === params.state),
    payment: PAYMENT_STATUSES.find((status) => status === params.payment),
    school: params.school?.trim().slice(0, 80) || undefined,
    country: params.country && /^[A-Z]{2}$/.test(params.country) ? params.country : undefined,
    registeredFrom: date(params.registeredFrom),
    registeredTo: date(params.registeredTo),
    startFrom: date(params.startFrom),
    startTo: date(params.startTo),
    expiryFrom: date(params.expiryFrom),
    expiryTo: date(params.expiryTo),
    sort: params.sort && params.sort in SORTS && params.sort !== "newest" ? (params.sort as SubscriptionSort) : undefined,
  };
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Dates are the admin's calendar days in India.
const dayStart = (date: string) => new Date(`${date}T00:00:00+05:30`);
const dayEnd = (date: string) => new Date(`${date}T23:59:59.999+05:30`);

async function buildQuery(filters: SubscriptionFilters, now: Date) {
  const and: Record<string, unknown>[] = [];

  if (filters.search) {
    const pattern = { $regex: escapeRegex(filters.search), $options: "i" };
    const digits = filters.search.replace(/\D/g, "");
    and.push({
      $or: [
        { "registration.childName": pattern },
        { "registration.name": pattern },
        { "registration.email": pattern },
        { reference: pattern },
        { "registration.phone": digits.length >= 3 ? { $regex: escapeRegex(digits) } : pattern },
      ],
    });
  }
  if (filters.plan) and.push({ plan: filters.plan });
  if (filters.programme) and.push({ "planSnapshot.programme": filters.programme });
  if (filters.school) and.push({ "registration.school": { $regex: escapeRegex(filters.school), $options: "i" } });
  if (filters.country) and.push({ "registration.address.countryCode": filters.country });
  if (filters.registeredFrom || filters.registeredTo) {
    and.push({
      createdAt: {
        ...(filters.registeredFrom && { $gte: dayStart(filters.registeredFrom) }),
        ...(filters.registeredTo && { $lte: dayEnd(filters.registeredTo) }),
      },
    });
  }
  if (filters.state) and.push(stateFilter(filters.state, now));
  if (filters.startFrom || filters.startTo) {
    and.push({
      startDate: {
        ...(filters.startFrom && { $gte: dayStart(filters.startFrom) }),
        ...(filters.startTo && { $lte: dayEnd(filters.startTo) }),
      },
    });
  }
  if (filters.expiryFrom || filters.expiryTo) {
    and.push({
      expiryDate: {
        ...(filters.expiryFrom && { $gte: dayStart(filters.expiryFrom) }),
        ...(filters.expiryTo && { $lte: dayEnd(filters.expiryTo) }),
      },
    });
  }
  if (filters.payment) {
    and.push({ _id: { $in: await Payment.distinct("subscription", { status: filters.payment }) } });
  }
  return and.length ? { $and: and } : {};
}

type ListedPayment = {
  _id: Types.ObjectId;
  amount: number;
  status: PaymentStatus;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string;
  paidAt?: Date | null;
} | null;

type Consent = { given?: boolean | null; at?: Date | null } | null | undefined;
type ExportedRegistration = {
  consents?: { terms?: Consent; featureWork?: Consent; whatsappUpdates?: Consent } | null;
  preferences?: { nickname?: string | null; selections?: { categoryName: string; topics: { title: string }[] }[] } | null;
  address?: { line1?: string; line2?: string | null } | null;
};

function withDerived<T extends { status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "CANCELLED"; startDate?: Date | null; expiryDate?: Date | null }>(item: T, now: Date) {
  return { ...item, state: deriveState(item, now), daysRemaining: remainingDays(item.expiryDate, now) };
}

export async function listSubscriptionsAdmin(params: SubscriptionFilters & { page?: string | number; limit?: string | number }) {
  await connectToDatabase();
  const now = new Date();
  const { page, limit, skip } = getPagination(params);
  const query = await buildQuery(params, now);
  const [items, total] = await Promise.all([
    Subscription.find(query)
      .sort(SORTS[params.sort ?? "newest"].order)
      .skip(skip)
      .limit(limit)
      .populate<{ payment: ListedPayment }>("payment", "amount status razorpayPaymentId")
      .lean(),
    Subscription.countDocuments(query),
  ]);
  // Which of these end within the reminder window and haven't been renewed yet: one query for the page's registrations.
  const ending = items.filter((item) => item.status === "ACTIVE" && item.registrationId);
  const siblings = ending.length
    ? await Subscription.find({ registrationId: { $in: ending.flatMap((item) => (item.registrationId ? [item.registrationId] : [])) }, status: "ACTIVE" }).select("registrationId expiryDate").lean()
    : [];
  const listed = items.map((item) => ({
    ...withDerived(item, now),
    renewalDue: renewalReminderDue(
      item,
      siblings.filter((other) => item.registrationId && other.registrationId?.equals(item.registrationId) && !other._id.equals(item._id)).map((other) => other.expiryDate),
      now
    ),
  }));
  return { items: listed, page, limit, total, pages: totalPages(total, limit) };
}

/** State counts for the filter tabs, under every filter except the state itself. */
export async function countSubscriptionsByState(filters: SubscriptionFilters) {
  await connectToDatabase();
  const now = new Date();
  const base = await buildQuery({ ...filters, state: undefined }, now);
  // One pass over the matching rows, counting every state at once.
  const [row] = await Subscription.aggregate<Record<SubscriptionState, { n: number }[]>>([
    { $match: base },
    { $facet: Object.fromEntries(SUBSCRIPTION_STATES.map((state) => [state, [{ $match: stateFilter(state, now) }, { $count: "n" }]])) },
  ]);
  return Object.fromEntries(SUBSCRIPTION_STATES.map((state) => [state, row?.[state]?.[0]?.n ?? 0])) as Record<SubscriptionState, number>;
}

export async function listSubscriptionsForExport(filters: SubscriptionFilters) {
  await connectToDatabase();
  const now = new Date();
  const items = await Subscription.find(await buildQuery(filters, now))
    .sort(SORTS[filters.sort ?? "newest"].order)
    .limit(MAX_EXPORT_ROWS)
    .populate<{ payment: ListedPayment }>("payment", "amount status razorpayPaymentId razorpayOrderId paidAt")
    .populate<{ registrationId: ExportedRegistration | null }>("registrationId", "consents preferences address child")
    .lean();
  return items.map((item) => withDerived(item, now));
}

/** The programmes and countries registrations have, for the list's filters. */
export async function listRegistrationFilterOptions() {
  await connectToDatabase();
  const [programmes, countries] = await Promise.all([
    Subscription.distinct("planSnapshot.programme"),
    Subscription.aggregate<{ _id: string; name: string }>([
      { $match: { "registration.address.countryCode": { $nin: [null, ""] } } },
      { $group: { _id: "$registration.address.countryCode", name: { $first: "$registration.address.country" } } },
      { $sort: { name: 1 } },
    ]),
  ]);
  return {
    programmes: (programmes.filter(Boolean) as string[]).sort(),
    countries: countries.map((row) => ({ code: row._id, name: row.name || row._id })),
  };
}

export async function listPlanOptions() {
  await connectToDatabase();
  const { SubscriptionPlan } = await import("@/models/SubscriptionPlan");
  return SubscriptionPlan.find({}, "name ageGroup durationMonths").sort({ ageGroup: 1, durationMonths: 1 }).lean();
}

export async function getSubscriptionDetail(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  const now = new Date();
  const subscription = await Subscription.findById(id).lean();
  if (!subscription) return null;

  const [registration, subscriber, payments, others, renewals] = await Promise.all([
    subscription.registrationId ? Registration.findById(subscription.registrationId).lean() : null,
    subscription.subscriber ? Subscriber.findById(subscription.subscriber).lean() : null,
    Payment.find({ subscription: subscription._id }).sort({ createdAt: -1 }).limit(50).lean(),
    // The parent's other children and older subscriptions.
    subscription.subscriber
      ? Subscription.find({
          subscriber: subscription.subscriber,
          _id: { $ne: subscription._id },
          ...(subscription.registrationId && { registrationId: { $ne: subscription.registrationId } }),
        }).sort({ createdAt: -1 }).limit(20).lean()
      : [],
    // Every subscription for this child's registration: the first one and each renewal.
    subscription.registrationId
      ? Subscription.find({ registrationId: subscription.registrationId }).sort({ createdAt: 1 }).limit(100).populate<{ payment: ListedPayment }>("payment", "amount status").lean()
      : [],
  ]);
  return {
    subscription: withDerived(subscription, now),
    renewalDue: renewalReminderDue(
      subscription,
      renewals.filter((item) => !item._id.equals(subscription._id)).map((item) => item.expiryDate),
      now
    ),
    registration,
    subscriber,
    payments,
    others: others.map((item) => withDerived(item, now)),
    renewals: renewals.map((item) => withDerived(item, now)),
  };
}

/** Stops a subscription. A cancelled subscription's payment record is left exactly as it was. */
export async function cancelSubscription(id: string, reason?: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return Subscription.findOneAndUpdate(
    { _id: id, status: { $in: ["ACTIVE", "PENDING_PAYMENT"] } },
    { $set: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason?.slice(0, 300) } },
    { new: true }
  );
}

export async function getSubscriptionStats() {
  await connectToDatabase();
  const now = new Date();
  const [totalUsers, states, paid, failedPayments, distribution, recentRegistrations, recentPayments] = await Promise.all([
    Subscriber.countDocuments(),
    countSubscriptionsByState({}),
    Payment.aggregate<{ count: number; revenue: number }>([
      { $match: { status: "PAID" } },
      { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$amount" } } },
    ]),
    Payment.countDocuments({ status: "FAILED" }),
    Subscription.aggregate<{ _id: { name: string; ageGroup: string }; count: number }>([
      { $match: { status: "ACTIVE", startDate: { $not: { $gt: now } }, expiryDate: { $gt: now } } },
      { $group: { _id: { name: "$planSnapshot.name", ageGroup: "$planSnapshot.ageGroup" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Subscriber.find({}, "name email createdAt").sort({ createdAt: -1 }).limit(5).lean(),
    Payment.find({}, "amount status createdAt subscription")
      .sort({ createdAt: -1 })
      .limit(6)
      .populate<{ subscription: { registration?: { name?: string }; planSnapshot?: { name?: string } } | null }>("subscription", "registration.name planSnapshot.name")
      .lean(),
  ]);

  return {
    totalUsers,
    states,
    active: states.ACTIVE + states.EXPIRING_SOON + states.EXPIRING_TODAY,
    expiringWithin7Days: states.EXPIRING_SOON + states.EXPIRING_TODAY,
    successfulPayments: paid[0]?.count ?? 0,
    revenue: paid[0]?.revenue ?? 0,
    failedPayments,
    distribution: distribution.map((row) => ({ label: `${row._id.name} (ages ${row._id.ageGroup})`, value: row.count })),
    recentRegistrations,
    recentPayments,
  };
}
