import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { STORED_SUBSCRIPTION_STATUSES } from "@/lib/subscription-status";

/**
 * One purchase of a plan. It starts as PENDING_PAYMENT, holding what the
 * customer typed, and becomes ACTIVE (with its dates and its Subscriber) only
 * when the payment is verified on the server. The plan's details are copied
 * in so later edits to the plan never change what a customer bought.
 */
const subscriptionSchema = new Schema(
  {
    subscriber: { type: Schema.Types.ObjectId, ref: "Subscriber" },
    plan: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    planSnapshot: {
      name: { type: String, required: true },
      ageGroup: { type: String, required: true },
      price: { type: Number, required: true },
      durationMonths: { type: Number, required: true },
    },
    registration: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      childName: { type: String, trim: true },
      childAge: { type: String, trim: true },
    },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },
    status: { type: String, enum: STORED_SUBSCRIPTION_STATUSES, required: true, default: "PENDING_PAYMENT" },
    startDate: { type: Date },
    expiryDate: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ status: 1, expiryDate: 1 });
subscriptionSchema.index({ subscriber: 1, createdAt: -1 });
subscriptionSchema.index({ plan: 1 });
subscriptionSchema.index({ "registration.email": 1, plan: 1 });

export type SubscriptionDocument = InferSchemaType<typeof subscriptionSchema>;

export const Subscription: Model<SubscriptionDocument> =
  models.Subscription ?? model<SubscriptionDocument>("Subscription", subscriptionSchema);
