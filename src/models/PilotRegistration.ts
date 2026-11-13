import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";
import { PILOT_RESERVATION_STATUSES } from "@/lib/pilot";

/**
 * One child's place in a pilot plan. It is RESERVED when payment starts (and
 * holds a slot for a while), CONFIRMED once the payment is verified, and
 * RELEASED (slot given back) if the payment is abandoned. A registration has
 * at most one of these, so a double click can never take two slots.
 *
 * The money and the subscription dates live on the Payment and Subscription;
 * the figures here are a copy so the pilot's own reports need no joins.
 */
const pilotRegistrationSchema = new Schema(
  {
    pilotPlan: { type: Schema.Types.ObjectId, ref: "PilotPlan", required: true },
    registration: { type: Schema.Types.ObjectId, ref: "Registration", required: true, unique: true },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    // The customer (parent), set once the payment is verified.
    user: { type: Schema.Types.ObjectId, ref: "Subscriber" },
    email: { type: String, required: true, lowercase: true, trim: true },
    subscriptionType: { type: String, enum: ["PILOT"], default: "PILOT", required: true },
    status: { type: String, enum: PILOT_RESERVATION_STATUSES, required: true, default: "RESERVED" },
    reservedUntil: { type: Date },
    registrationDate: { type: Date, required: true, default: () => new Date() },
    subscriptionStartDate: { type: Date },
    subscriptionExpiryDate: { type: Date },
    // Paise, GST included: what was paid.
    amount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["UNPAID", "PAID", "REFUNDED"], default: "UNPAID" },
    paymentReference: { type: String },
    // Copied from the plan when the slot is taken, so later edits don't rewrite history.
    planName: { type: String, required: true },
    confirmedAt: { type: Date },
    releasedAt: { type: Date },
    releaseReason: { type: String },
  },
  { timestamps: true }
);

pilotRegistrationSchema.index({ pilotPlan: 1, status: 1 });
pilotRegistrationSchema.index({ pilotPlan: 1, email: 1, status: 1 });
pilotRegistrationSchema.index({ status: 1, reservedUntil: 1 });
pilotRegistrationSchema.index({ subscription: 1 });

export type PilotRegistrationDocument = InferSchemaType<typeof pilotRegistrationSchema>;

if (process.env.NODE_ENV !== "production" && models.PilotRegistration) deleteModel("PilotRegistration");

export const PilotRegistration: Model<PilotRegistrationDocument> =
  models.PilotRegistration ?? model<PilotRegistrationDocument>("PilotRegistration", pilotRegistrationSchema);
