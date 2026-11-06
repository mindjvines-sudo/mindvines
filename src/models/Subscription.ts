import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";
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
    // The child registration this subscription pays for, and its reference (e.g. MV-7K3Q9P).
    registrationId: { type: Schema.Types.ObjectId, ref: "Registration" },
    reference: { type: String, trim: true },
    // True for a renewal of an existing registration (same child, same reference).
    renewal: { type: Boolean, default: false },
    plan: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    planSnapshot: {
      name: { type: String, required: true },
      ageGroup: { type: String, required: true },
      price: { type: Number, required: true },
      durationMonths: { type: Number, required: true },
      programme: { type: String, trim: true },
    },
    // A searchable copy of the registration (the full record, with topics and
    // consent times, is the Registration). `name` is the parent's; `childAge`
    // is worked out from the date of birth at the time.
    registration: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
      childName: { type: String, trim: true },
      childAge: { type: String, trim: true },
      childDob: { type: String, trim: true },
      school: { type: String, trim: true },
      nickname: { type: String, trim: true },
      address: {
        countryCode: { type: String, trim: true },
        country: { type: String, trim: true },
        line: { type: String, trim: true },
        city: { type: String, trim: true },
        postalCode: { type: String, trim: true },
      },
      // Topic titles as they read when chosen, so later edits in Admin → Topics don't change them.
      topics: {
        sketching: { type: [String], default: undefined },
        writing: { type: [String], default: undefined },
      },
      consents: {
        terms: { type: Boolean },
        termsAcceptedAt: { type: Date },
        featureWork: { type: Boolean },
        whatsappUpdates: { type: Boolean },
      },
    },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },
    status: { type: String, enum: STORED_SUBSCRIPTION_STATUSES, required: true, default: "PENDING_PAYMENT" },
    startDate: { type: Date },
    expiryDate: { type: Date },
    // Set once the confirmation email has gone out, so it is never sent twice.
    confirmationEmailSentAt: { type: Date },
    adminNotificationEmailSentAt: { type: Date },
    // The admin's "Send renewal reminder" button: when it last went out, and how many times.
    renewalReminderSentAt: { type: Date },
    renewalReminderCount: { type: Number, default: 0 },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ status: 1, expiryDate: 1 });
subscriptionSchema.index({ status: 1, startDate: 1, expiryDate: 1 });
subscriptionSchema.index({ createdAt: -1 });
subscriptionSchema.index({ subscriber: 1, createdAt: -1 });
subscriptionSchema.index({ plan: 1 });
subscriptionSchema.index({ "registration.email": 1, plan: 1 });
subscriptionSchema.index({ registrationId: 1, status: 1 });
subscriptionSchema.index({ reference: 1 });

export type SubscriptionDocument = InferSchemaType<typeof subscriptionSchema>;

// The dev server re-runs this file when the schema changes without restarting;
// drop the model built from the old schema so new fields are saved.
if (process.env.NODE_ENV !== "production" && models.Subscription) deleteModel("Subscription");

export const Subscription: Model<SubscriptionDocument> =
  models.Subscription ?? model<SubscriptionDocument>("Subscription", subscriptionSchema);
