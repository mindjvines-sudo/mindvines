import "server-only";
import { isValidObjectId, type Types } from "mongoose";
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
import { Subscriber } from "@/models/Subscriber";
import { Subscription } from "@/models/Subscription";

export type SubscriptionFilters = {
  search?: string;
  plan?: string;
  state?: SubscriptionState;
  payment?: PaymentStatus;
  startFrom?: string;
  startTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_EXPORT_ROWS = 5000;

/** Reads the filters out of a URL's query, ignoring anything that isn't a known value. */
export function parseSubscriptionFilters(params: Record<string, string | undefined>): SubscriptionFilters {
  const date = (value?: string) => (value && DATE.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined);
  return {
    search: params.search?.trim().slice(0, 80) || undefined,
    plan: params.plan && isValidObjectId(params.plan) ? params.plan : undefined,
    state: SUBSCRIPTION_STATES.find((state) => state === params.state),
    payment: PAYMENT_STATUSES.find((status) => status === params.payment),
    startFrom: date(params.startFrom),
    startTo: date(params.startTo),
    expiryFrom: date(params.expiryFrom),
    expiryTo: date(params.expiryTo),
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
        { "registration.name": pattern },
        { "registration.email": pattern },
        { "registration.phone": digits.length >= 3 ? { $regex: escapeRegex(digits) } : pattern },
      ],
    });
  }
  if (filters.plan) and.push({ plan: filters.plan });
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

type ListedPayment = { _id: Types.ObjectId; amount: number; status: PaymentStatus; razorpayPaymentId?: string | null } | null;

function withDerived<T extends { status: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "CANCELLED"; expiryDate?: Date | null }>(item: T, now: Date) {
  return { ...item, state: deriveState(item, now), daysRemaining: remainingDays(item.expiryDate, now) };
}

export async function listSubscriptionsAdmin(params: SubscriptionFilters & { page?: string | number; limit?: string | number }) {
  await connectToDatabase();
  const now = new Date();
  const { page, limit, skip } = getPagination(params);
  const query = await buildQuery(params, now);
  const [items, total] = await Promise.all([
    Subscription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate<{ payment: ListedPayment }>("payment", "amount status razorpayPaymentId")
      .lean(),
    Subscription.countDocuments(query),
  ]);
  return { items: items.map((item) => withDerived(item, now)), page, limit, total, pages: totalPages(total, limit) };
}

/** State counts for the filter tabs, under every filter except the state itself. */
export async function countSubscriptionsByState(filters: SubscriptionFilters) {
  await connectToDatabase();
  const now = new Date();
  const base = await buildQuery({ ...filters, state: undefined }, now);
  const entries = await Promise.all(
    SUBSCRIPTION_STATES.map(async (state) => [state, await Subscription.countDocuments({ $and: [base, stateFilter(state, now)] })] as const)
  );
  return Object.fromEntries(entries) as Record<SubscriptionState, number>;
}

export async function listSubscriptionsForExport(filters: SubscriptionFilters) {
  await connectToDatabase();
  const now = new Date();
  const items = await Subscription.find(await buildQuery(filters, now))
    .sort({ createdAt: -1 })
    .limit(MAX_EXPORT_ROWS)
    .populate<{ payment: ListedPayment }>("payment", "amount status razorpayPaymentId")
    .lean();
  return items.map((item) => withDerived(item, now));
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

  const [subscriber, payments, others] = await Promise.all([
    subscription.subscriber ? Subscriber.findById(subscription.subscriber).lean() : null,
    Payment.find({ subscription: subscription._id }).sort({ createdAt: -1 }).lean(),
    subscription.subscriber
      ? Subscription.find({ subscriber: subscription.subscriber, _id: { $ne: subscription._id } }).sort({ createdAt: -1 }).limit(20).lean()
      : [],
  ]);
  return {
    subscription: withDerived(subscription, now),
    subscriber,
    payments,
    others: others.map((item) => withDerived(item, now)),
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
      { $match: { status: "ACTIVE", expiryDate: { $gt: now } } },
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
