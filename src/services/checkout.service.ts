import "server-only";
import { type Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  razorpayKeyId,
  razorpayKeySecret,
  type RazorpayPayment,
} from "@/lib/razorpay";
import { verifyPaymentSignature } from "@/lib/razorpay-signature";
import { gstRatePercent } from "@/lib/gst";
import { addMonths, computeAmounts } from "@/lib/subscription-status";
import { Payment } from "@/models/Payment";
import { Subscriber } from "@/models/Subscriber";
import { Subscription } from "@/models/Subscription";
import { SubscriptionPlan } from "@/models/SubscriptionPlan";
import { applyStartedSubscriptions, completeRegistration, loadRegistrationForPayment, markRegistrationPaymentPending } from "@/services/registration.service";
import { subscriptionAdminAlertEmail, subscriptionConfirmationEmail, type SubscriptionEmailData } from "@/lib/email-templates";
import { SITE } from "@/lib/content";
import { sendEmail } from "@/services/email.service";
import { EMAIL_LOGO_CID, loadEmailLogo } from "@/services/email-logo.service";
import { prepareRenewal } from "@/services/renewal.service";
import { ageInYears } from "@/validations/registration.schema";
import { getSubscriberNotificationEmail } from "@/services/settings.service";
import { siteConfig } from "@/config/site";

export { gstRatePercent } from "@/lib/gst";

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

type PayableRegistration = Awaited<ReturnType<typeof loadRegistrationForPayment>>;
type PayablePlan = { _id: Types.ObjectId; name: string; ageGroup: string; price: number; durationMonths: number };

/**
 * Opens a Razorpay order for a registration and plan: a new registration's
 * first subscription, or a renewal. The plan is priced on the server; nothing
 * the browser sends is used for money. Only a PENDING_PAYMENT subscription is
 * saved here, holding a searchable copy of the registration; the customer
 * record waits for a verified payment. A retry within half an hour picks up
 * the order it already has, so paying twice is never offered.
 */
async function openOrder(
  registration: PayableRegistration,
  plan: PayablePlan,
  options: { renewal: boolean; programmeName?: string | null }
): Promise<CheckoutOrder> {
  const { baseAmount, taxAmount, totalAmount } = computeAmounts(plan.price, gstRatePercent());
  if (totalAmount < 100) throw new CheckoutError("PLAN_UNAVAILABLE", "This plan can't be bought online.");

  const { child, parent, address, consents, preferences } = registration;
  if (!child || !parent || !address) throw new CheckoutError("NOT_FOUND", "Your registration is incomplete. Please check your details.");
  const snapshot = {
    name: parent.name,
    email: parent.email,
    phone: `+${parent.phoneDial} ${parent.phone}`,
    childName: child.name,
    childAge: String(ageInYears(child.dob)),
    childDob: child.dob,
    school: child.school,
    nickname: preferences?.nickname ?? undefined,
    address: {
      countryCode: address.countryCode,
      country: address.country,
      line: [address.line1, address.line2].filter(Boolean).join(", "),
      city: address.city,
      postalCode: address.postalCode,
    },
    consents: {
      terms: consents?.terms?.given ?? false,
      termsAcceptedAt: consents?.terms?.at ?? undefined,
      featureWork: consents?.featureWork?.given ?? false,
      whatsappUpdates: consents?.whatsappUpdates?.given ?? false,
    },
  };
  const planSnapshot = {
    name: plan.name,
    ageGroup: plan.ageGroup,
    price: plan.price,
    durationMonths: plan.durationMonths,
    programme: options.programmeName ?? registration.programmeName ?? undefined,
  };

  const recent = await Subscription.findOne({
    status: "PENDING_PAYMENT",
    registrationId: registration._id,
    plan: plan._id,
    createdAt: { $gt: new Date(Date.now() - REUSE_ORDER_MS) },
  })
    .sort({ createdAt: -1 })
    .populate<{ payment: { _id: Types.ObjectId; razorpayOrderId: string; amount: number; currency: string; status: string } | null }>(
      "payment",
      "razorpayOrderId amount currency status"
    );
  if (recent?.payment && recent.payment.amount === totalAmount && (UNSETTLED as readonly string[]).includes(recent.payment.status)) {
    await Subscription.updateOne({ _id: recent._id }, { $set: { registration: snapshot, planSnapshot } });
    return { orderId: recent.payment.razorpayOrderId, keyId: razorpayKeyId(), amount: totalAmount, currency: recent.payment.currency };
  }

  const subscription = await Subscription.create({
    plan: plan._id,
    planSnapshot,
    registration: snapshot,
    registrationId: registration._id,
    reference: registration.reference,
    renewal: options.renewal,
    status: "PENDING_PAYMENT",
  });

  try {
    const order = await createRazorpayOrder({
      amount: totalAmount,
      receipt: `${registration.reference}-${subscription._id.toString().slice(-6)}`,
      notes: {
        subscriptionId: subscription._id.toString(),
        reference: registration.reference,
        planId: plan._id.toString(),
        email: parent.email,
        type: options.renewal ? "renewal" : "registration",
      },
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

/** Page 3 of the registration form: payment for a saved registration (pages 1 and 2 complete). */
export async function createCheckoutOrder(registrationId: string, token: string): Promise<CheckoutOrder> {
  await connectToDatabase();
  const registration = await loadRegistrationForPayment(registrationId, token);
  const plan = await SubscriptionPlan.findOne({ _id: registration.plan, status: "PUBLISHED" }).lean();
  if (!plan) throw new CheckoutError("PLAN_UNAVAILABLE", "This plan is no longer available.");
  const order = await openOrder(registration, plan, { renewal: false });
  await markRegistrationPaymentPending(registration._id);
  return order;
}

/**
 * Renewing a registration (looked up by its number) with any published plan.
 * Topics for lists the child hasn't picked from yet (a new programme) are
 * checked and saved first.
 */
export async function createRenewalOrder(params: {
  registrationId: string;
  token: string;
  planId: string;
  selections: Record<string, string[]>;
}): Promise<CheckoutOrder> {
  await connectToDatabase();
  const { registration, plan, programmeName } = await prepareRenewal(params);
  return openOrder(registration, plan, { renewal: true, programmeName });
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

  // Renewing early starts where this child's current subscription ends. A
  // registration is one child, so a parent's other children never affect it;
  // older subscriptions without one fall back to the parent and age group.
  const now = new Date();
  const current = await Subscription.findOne({
    _id: { $ne: subscription._id },
    status: "ACTIVE",
    expiryDate: { $gt: now },
    ...(subscription.registrationId
      ? { registrationId: subscription.registrationId }
      : { subscriber: subscriber._id, "planSnapshot.ageGroup": planSnapshot.ageGroup }),
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
  if (activated) {
    await Payment.updateOne({ _id: payment._id }, { $set: { subscriber: subscriber._id } });
    if (subscription.registrationId) {
      await completeRegistration(subscription.registrationId, {
        subscriber: subscriber._id,
        subscription: subscription._id,
        plan: subscription.plan,
        programmeName: planSnapshot.programme,
        // Queued behind the current subscription: the child stays on the current programme until this one starts.
        startsNow: startDate <= now,
      });
    }
    await sendSubscriptionEmails(subscription._id, payment._id, startDate, now);
  }
}

/**
 * Emails the parent and admin once their subscription is confirmed. Never throws and
 * runs only after the one-time activation above, so a payment confirmed twice
 * (browser and webhook) still sends one email.
 */
async function sendSubscriptionEmails(subscriptionId: Types.ObjectId, paymentId: Types.ObjectId, startDate: Date, now: Date) {
  try {
    const [subscription, payment] = await Promise.all([Subscription.findById(subscriptionId).lean(), Payment.findById(paymentId).lean()]);
    if (!subscription?.planSnapshot || !subscription.registration || !subscription.expiryDate || !payment) return;
    const { registration, planSnapshot } = subscription;
    const topics = registration.topics
      ? [
          ...(registration.topics.writing?.length ? [{ category: "Writing", titles: registration.topics.writing }] : []),
          ...(registration.topics.sketching?.length ? [{ category: "Sketching", titles: registration.topics.sketching }] : []),
        ]
      : [];
    const logo = await loadEmailLogo();
    const data: SubscriptionEmailData = {
      site: { name: SITE.name, url: SITE.url, logoUrl: logo ? `cid:${EMAIL_LOGO_CID}` : undefined, email: SITE.email, phone: SITE.phone },
      parentName: registration.name,
      childName: registration.childName || "your child",
      reference: subscription.reference ?? "",
      renewal: Boolean(subscription.renewal),
      programme: planSnapshot.programme ?? "",
      planName: planSnapshot.name,
      ageGroup: planSnapshot.ageGroup,
      durationMonths: planSnapshot.durationMonths,
      startDate,
      expiryDate: subscription.expiryDate,
      amountPaise: payment.amount,
      taxPaise: payment.taxAmount,
      paymentId: payment.razorpayPaymentId,
      topics,
      queued: startDate > now,
    };
    const attachments = logo ? [logo] : undefined;
    // Each delivery is independent: a failed parent email must not suppress the staff alert.
    const deliveries = await Promise.allSettled([
      (async () => {
        if (subscription.confirmationEmailSentAt) return;
        const result = await sendEmail({ to: registration.email, ...subscriptionConfirmationEmail(data), attachments });
        if (result.ok) await Subscription.updateOne({ _id: subscriptionId }, { $set: { confirmationEmailSentAt: new Date() } });
      })(),
      (async () => {
        if (subscription.adminNotificationEmailSentAt) return;
        const to = await getSubscriberNotificationEmail();
        const result = await sendEmail({
          to,
          ...subscriptionAdminAlertEmail({
            ...data,
            parentEmail: registration.email,
            parentPhone: registration.phone,
            adminUrl: `${siteConfig.url}/admin/subscribers/${subscriptionId}`,
          }),
          replyTo: registration.email,
          attachments,
        });
        if (result.ok) await Subscription.updateOne({ _id: subscriptionId }, { $set: { adminNotificationEmailSentAt: new Date() } });
      })(),
    ]);
    for (const delivery of deliveries) {
      if (delivery.status === "rejected") console.error("[email] subscription delivery failed:", delivery.reason instanceof Error ? delivery.reason.message : delivery.reason);
    }
  } catch (error) {
    console.error("[email] subscription confirmation failed:", error instanceof Error ? error.message : error);
  }
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
  await applyStartedSubscriptions({}, now);
  return result.modifiedCount;
}
