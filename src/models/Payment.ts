import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { PAYMENT_STATUSES } from "@/lib/subscription-status";

/**
 * A Razorpay order and what became of it. Amounts are in paise, as Razorpay
 * takes them. PAID is only ever set after a verified signature or webhook.
 */
const paymentSchema = new Schema(
  {
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
    subscriber: { type: Schema.Types.ObjectId, ref: "Subscriber" },
    plan: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    // Unique among payments that have one, so one Razorpay payment can settle only one order.
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    baseAmount: { type: Number, required: true },
    taxAmount: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "INR" },
    status: { type: String, enum: PAYMENT_STATUSES, required: true, default: "CREATED" },
    method: { type: String },
    failureReason: { type: String },
    verification: {
      signatureVerified: { type: Boolean, default: false },
      verifiedVia: { type: String, enum: ["CHECKOUT", "WEBHOOK"] },
      verifiedAt: { type: Date },
      razorpayStatus: { type: String },
    },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ subscription: 1 });
paymentSchema.index({ subscriber: 1, createdAt: -1 });

export type PaymentDocument = InferSchemaType<typeof paymentSchema>;

export const Payment: Model<PaymentDocument> = models.Payment ?? model<PaymentDocument>("Payment", paymentSchema);
