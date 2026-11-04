import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CONTENT_STATUSES } from "@/lib/constants";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

const subscriptionPlanSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  ageGroup: { type: String, enum: SUBSCRIPTION_AGE_GROUPS, required: true },
  price: { type: Number, required: true, min: 0 },
  durationMonths: { type: Number, required: true, min: 1 },
  journalCount: { type: Number, required: true, min: 1 },
  features: { type: [String], default: [] },
  registrationUrl: { type: String, default: "" },
  // Optional label on the plan, such as "Save 27%".
  badge: { type: String, trim: true, default: "" },
  // Checkout button on the plan card, such as "Choose writing". Empty means "Subscribe now".
  buttonLabel: { type: String, trim: true, default: "" },
  featured: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  status: { type: String, enum: CONTENT_STATUSES, default: "DRAFT", required: true },
}, { timestamps: true });

subscriptionPlanSchema.index({ status: 1, ageGroup: 1, displayOrder: 1 });

export type SubscriptionPlanDocument = InferSchemaType<typeof subscriptionPlanSchema>;
export const SubscriptionPlan: Model<SubscriptionPlanDocument> =
  models.SubscriptionPlan ?? model<SubscriptionPlanDocument>("SubscriptionPlan", subscriptionPlanSchema);
