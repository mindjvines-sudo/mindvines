import "server-only";
import { isValidObjectId, type Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  razorpayKeyId,
  razorpayKeySecret,
  type RazorpayPayment,
} from "@/lib/razorpay";
import { verifyPaymentSignature } from "@/lib/razorpay-signature";
import { addMonths, computeAmounts } from "@/lib/subscription-status";
import { Payment } from "@/models/Payment";
import { Subscriber } from "@/models/Subscriber";
import { Subscription } from "@/models/Subscription";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import type { CheckoutDetails } from "@/validations/checkout.schema";

/** GST added to a plan's listed price. 18% is India's rate for this kind of service; override with GST_RATE_PERCENT. */
export function gstRatePercent(): number {
  const configured = Number(process.env.GST_RATE_PERCENT);
  return Number.isFinite(configured) && configured >= 0 && configured <= 50 ? configured : 18;
}

export class CheckoutError extends Error {
  constructor(
    readonly code: "PLAN_UNAVAILABLE" | "NOT_FOUND" | "BAD_SIGNATURE" | "UNAVAILABLE",
    message: string
  ) {
    super(message);
  }
}

/** Customers who left a payment half-way are sent back to the same order for this long. */
const REUSE_ORDER_MS = 30 * 60 * 1000;
const UNSETTLED = ["CREATED", "PENDING", "FAILED", "CANCELLED"] as const;

function isDuplicateKey(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export type CheckoutOrder = {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
};

/**
 * Prices the plan on the server (the browser's numbers are never used), then
 * opens a Razorpay order. Nothing but a PENDING_PAYMENT subscription is saved
 * here; the customer record waits for a verified payment.
 */
export async function createCheckoutOrder(planId: string, details: CheckoutDetails): Promise<CheckoutOrder> {
  await connectToDatabase();
  const plan = isValidObjectId(planId) ? await SubscriptionPlan.findOne({ _id: planId, status: "PUBLISHED" }).lean() : null;
  if (!plan) throw new CheckoutError("PLAN_UNAVAILABLE", "This plan is no longer available.");

  const { baseAmount, taxAmount, totalAmount } = computeAmounts(plan.price, gstRatePercent());
  if (totalAmount < 100) throw new CheckoutError("PLAN_UNAVAILABLE", "This plan can't be bought online.");

  const registration = { name: details.name, email: details.email, phone: details.phone, childName: details.childName, childAge: details.childAge };

  // A retry within half an hour picks up the order it already has.
  const recent = await Subscription.findOne({
    status: "PENDING_PAYMENT",
    plan: plan._id,
    "registration.email": details.email,
    createdAt: { $gt: new Date(Date.now() - REUSE_ORDER_MS) },
  })
    .sort({ createdAt: -1 })
    .populate<{ payment: { _id: Types.ObjectId; razorpayOrderId: string; amount: number; currency: string; status: string } | null }>(
      "payment",
      "razorpayOrderId amount currency status"
    );
  if (recent?.payment && recent.payment.amount === totalAmount && (UNSETTLED as readonly string[]).includes(recent.payment.status)) {
    await Subscription.updateOne({ _id: recent._id }, { $set: { registration } });
    return { orderId: recent.payment.razorpayOrderId, keyId: razorpayKeyId(), amount: totalAmount, currency: recent.payment.currency };
  }

  const subscription = await Subscription.create({
    plan: plan._id,
    planSnapshot: { name: plan.name, ageGroup: plan.ageGroup, price: plan.price, durationMonths: plan.durationMonths },
    registration,
    status: "PENDING_PAYMENT",
  });

  try {
    const order = await createRazorpayOrder({
      amount: totalAmount,
      receipt: subscription._id.toString(),
      notes: { subscriptionId: subscription._id.toString(), planId: plan._id.toString(), email: details.email },
    });
    const payment = await Payment.create({
      subscription: subscription._id,
      plan: plan._id,
      razorpayOrderId: order.id,
      baseAmount,
      taxAmount,
      amount: totalAmount,
      currency: order.currency,
      status: "CREATED",
    });
    await Subscription.updateOne({ _id: subscription._id }, { $set: { payment: payment._id } });
    return { orderId: order.id, keyId: razorpayKeyId(), amount: totalAmount, currency: order.currency };
  } catch (error) {
    await Subscription.deleteOne({ _id: subscription._id });
    throw error;
  }
}

export type SettleResult = "paid" | "pending" | "mismatch" | "unknown";

/**
 * The one place a payment turns into a subscription, shared by the browser
 * callback and the webhook. Safe to run any number of times for the same
 * order: only one caller wins the PAID transition, and activation only
 * touches a subscription that is still pending.
 */
export async function settlePayment(params: {
  orderId: string;
  razorpayPayment: Pick<RazorpayPayment, "id" | "order_id" | "amount" | "currency" | "status" | "method">;
  via: "CHECKOUT" | "WEBHOOK";
  signatureVerified: boolean;
}): Promise<SettleResult> {
  await connectToDatabase();
  const { orderId, razorpayPayment: rzp, via, signatureVerified } = params;
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment) return "unknown";

  // The amount and currency must be exactly what this server asked for.
  if (rzp.amount !== payment.amount || rzp.currency !== payment.currency || (rzp.order_id && rzp.order_id !== orderId)) {
    if (payment.status !== "PAID") {
      await Payment.updateOne(
        { _id: payment._id, status: { $ne: "PAID" } },
        { $set: { status: "FAILED", failureReason: `Amount or currency mismatch (${rzp.amount} ${rzp.currency})` } }
      );
    }
    return "mismatch";
  }

  // Authorised but not yet captured: wait for the webhook rather than activate.
  if (rzp.status !== "captured") {
    await Payment.updateOne(
      { _id: payment._id, status: { $in: ["CREATED", "FAILED", "CANCELLED"] } },
      { $set: { status: "PENDING", "verification.razorpayStatus": rzp.status } }
    );
    return "pending";
  }

  let settled = payment;
  if (payment.status !== "PAID") {
    try {
      const won = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: "PAID" } },
        {
          $set: {
            status: "PAID",
            razorpayPaymentId: rzp.id,
            method: rzp.method,
            paidAt: new Date(),
            verification: { signatureVerified, verifiedVia: via, verifiedAt: new Date(), razorpayStatus: rzp.status },
          },
          $unset: { failureReason: "" },
        },
        { new: true }
      );
      if (won) settled = won;
      else {
        const current = await Payment.findById(payment._id);
        if (!current) return "unknown";
        settled = current;
      }
    } catch (error) {
      // The same Razorpay payment is already attached to another order.
      if (isDuplicateKey(error)) return "mismatch";
      throw error;
    }
  }

  // A second, different payment for an order that is already settled is not applied.
  if (settled.razorpayPaymentId && settled.razorpayPaymentId !== rzp.id) return "mismatch";

  await activateSubscription(settled._id);
  return "paid";
}

async function upsertSubscriber(registration: { name: string; email: string; phone: string; childName?: string | null; childAge?: string | null }) {
  const update = {
    $set: { name: registration.name, phone: registration.phone, childName: registration.childName, childAge: registration.childAge },
  };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true } as const;
  try {
    return await Subscriber.findOneAndUpdate({ email: registration.email }, update, options);
  } catch (error) {
    // Two payments for the same new email at once: the loser finds the winner's record.
    if (isDuplicateKey(error)) return Subscriber.findOneAndUpdate({ email: registration.email }, update, options);
    throw error;
  }
}

/** Idempotent: does nothing unless the subscription is still waiting for its payment. */
async function activateSubscription(paymentId: Types.ObjectId) {
  const payment = await Payment.findById(paymentId);
  if (!payment) return;
  const subscription = await Subscription.findById(payment.subscription);
  if (!subscription || subscription.status !== "PENDING_PAYMENT" || !subscription.registration || !subscription.planSnapshot) return;
  const { registration, planSnapshot } = subscription;

  const subscriber = await upsertSubscriber(registration);
  if (!subscriber) return;

  // Renewing early starts where the current plan for that age group ends.
  const now = new Date();
  const current = await Subscription.findOne({
    subscriber: subscriber._id,
    status: "ACTIVE",
    "planSnapshot.ageGroup": planSnapshot.ageGroup,
    expiryDate: { $gt: now },
  }).sort({ expiryDate: -1 });
  const startDate = current?.expiryDate ?? now;

  const activated = await Subscription.findOneAndUpdate(
    { _id: subscription._id, status: "PENDING_PAYMENT" },
    {
      $set: {
        subscriber: subscriber._id,
        status: "ACTIVE",
        startDate,
        expiryDate: addMonths(startDate, planSnapshot.durationMonths),
      },
    }
  );
  if (activated) await Payment.updateOne({ _id: payment._id }, { $set: { subscriber: subscriber._id } });
}

/** The browser's success callback: its signature is checked here, then the payment is read back from Razorpay. */
export async function confirmCheckoutPayment(params: { orderId: string; paymentId: string; signature: string }): Promise<SettleResult> {
  const valid = verifyPaymentSignature({ ...params, secret: razorpayKeySecret() });
  if (!valid) throw new CheckoutError("BAD_SIGNATURE", "Payment could not be verified.");

  let rzp: RazorpayPayment;
  try {
    rzp = await fetchRazorpayPayment(params.paymentId);
  } catch {
    // Razorpay can't be reached right now; the webhook will settle it.
    await connectToDatabase();
    await Payment.updateOne({ razorpayOrderId: params.orderId, status: { $in: ["CREATED", "FAILED", "CANCELLED"] } }, { $set: { status: "PENDING" } });
    return "pending";
  }
  return settlePayment({ orderId: params.orderId, razorpayPayment: rzp, via: "CHECKOUT", signatureVerified: true });
}

/** A failed or cancelled attempt. Never downgrades a payment that has been paid. */
export async function recordPaymentOutcome(orderId: string, outcome: "failed" | "cancelled", reason?: string) {
  await connectToDatabase();
  await Payment.updateOne(
    { razorpayOrderId: orderId, status: { $in: UNSETTLED } },
    { $set: { status: outcome === "failed" ? "FAILED" : "CANCELLED", failureReason: reason?.slice(0, 300) } }
  );
}

export async function getPaymentStatus(orderId: string) {
  await connectToDatabase();
  const payment = await Payment.findOne({ razorpayOrderId: orderId }, "status").lean();
  return payment?.status ?? null;
}

/** Writes EXPIRED for lapsed subscriptions. Reads never depend on this having run. */
export async function expireLapsedSubscriptions(now = new Date()) {
  await connectToDatabase();
  const result = await Subscription.updateMany({ status: "ACTIVE", expiryDate: { $lte: now } }, { $set: { status: "EXPIRED" } });
  return result.modifiedCount;
}
