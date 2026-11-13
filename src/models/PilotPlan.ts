import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";
import { PILOT_DISCOUNT_TYPES, PILOT_DURATIONS, PILOT_ELIGIBILITY_TYPES, PILOT_STATUSES } from "@/lib/pilot";

/**
 * A limited-time offer an admin configures: its own name, duration, price,
 * registration window, slot limit and who may join. `basePlan` is the ordinary
 * plan whose programme and topic lists a pilot family registers with; the
 * pilot's own price and duration are what they pay and get.
 *
 * `registrationCount` counts paid, confirmed registrations; `reservedCount`
 * counts slots held for a payment in progress. Both are only ever changed with
 * atomic updates (see pilot.service), so they can never exceed the limit.
 */
const pilotPlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    basePlan: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    duration: { type: String, enum: PILOT_DURATIONS, required: true },
    customDuration: { type: Number, min: 1 },
    // Worked out from `duration`/`customDuration` on save; what activation uses.
    durationMonths: { type: Number, required: true, min: 1 },
    originalPrice: { type: Number, required: true, min: 0 },
    discountType: { type: String, enum: PILOT_DISCOUNT_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 0 },
    // Worked out from the original price and discount on save; what is charged (before GST).
    offerPrice: { type: Number, required: true, min: 0 },
    maxRegistrations: { type: Number, required: true, min: 1 },
    registrationCount: { type: Number, required: true, default: 0, min: 0 },
    reservedCount: { type: Number, required: true, default: 0, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: PILOT_STATUSES, required: true, default: "INACTIVE" },
    eligibilityType: { type: String, enum: PILOT_ELIGIBILITY_TYPES, required: true, default: "PUBLIC" },
    // Unique among restricted plans, so a code leads to exactly one plan. Never sent to the public.
    accessCode: { type: String, trim: true, uppercase: true },
    allowedEmails: { type: [String], default: [] },
    // How many registrations (children) one parent email may hold in this plan; 0 means no limit.
    maxPerEmail: { type: Number, required: true, default: 1, min: 0 },
    termsAndConditions: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

pilotPlanSchema.index({ accessCode: 1 }, { unique: true, partialFilterExpression: { accessCode: { $type: "string" } } });
pilotPlanSchema.index({ status: 1, eligibilityType: 1, startDate: 1, endDate: 1 });

export type PilotPlanDocument = InferSchemaType<typeof pilotPlanSchema>;

// The dev server re-runs this file when the schema changes without restarting.
if (process.env.NODE_ENV !== "production" && models.PilotPlan) deleteModel("PilotPlan");

export const PilotPlan: Model<PilotPlanDocument> = models.PilotPlan ?? model<PilotPlanDocument>("PilotPlan", pilotPlanSchema);
