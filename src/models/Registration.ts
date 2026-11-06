import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";
import { REGISTRATION_STATUSES } from "@/lib/registration-status";

const consent = {
  given: { type: Boolean, required: true, default: false },
  // When the box was last ticked or unticked.
  at: { type: Date },
};

/**
 * One child's registration: who they are, where the journals go, the parent's
 * permissions and the child's favourite topics. Saved as a draft from page 1
 * of the form; finalised, and linked to its Subscriber (the parent) and
 * Subscription, only when the payment is verified. A parent registering a
 * second child gets a second registration under the same Subscriber.
 */
const registrationSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: REGISTRATION_STATUSES, required: true, default: "DRAFT" },
    // The browser proves it owns a draft with a secret token; only its hash is kept.
    tokenHash: { type: String, required: true, select: false },

    plan: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },
    programme: { type: Schema.Types.ObjectId, ref: "Programme" },
    programmeName: { type: String, trim: true },

    child: {
      name: { type: String, required: true, trim: true },
      dob: { type: String, required: true },
      school: { type: String, required: true, trim: true },
    },
    parent: {
      name: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phoneCountry: { type: String, required: true },
      phoneDial: { type: String, required: true },
      phone: { type: String, required: true },
    },
    address: {
      countryCode: { type: String, required: true },
      country: { type: String, required: true },
      line1: { type: String, required: true, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
    },
    consents: {
      terms: consent,
      featureWork: consent,
      whatsappUpdates: consent,
    },

    // Page 2. Topics are kept with their titles as chosen and the quarterly
    // version they came from, so later topic changes never rewrite them.
    preferences: {
      nickname: { type: String, trim: true },
      topicVersion: { type: Schema.Types.ObjectId, ref: "TopicVersion" },
      selections: [
        {
          _id: false,
          category: { type: Schema.Types.ObjectId, ref: "TopicCategory", required: true },
          categoryName: { type: String, required: true },
          topics: [{ _id: false, topic: { type: Schema.Types.ObjectId, ref: "Topic" }, title: { type: String, required: true } }],
        },
      ],
      savedAt: { type: Date },
    },

    subscriber: { type: Schema.Types.ObjectId, ref: "Subscriber" },
    // The latest subscription for this child: the first one, then each renewal.
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription" },
    // A parent renewing proves who they are (registration number + email or
    // mobile) and gets a short-lived token; only its hash is kept.
    renewalAccess: {
      tokenHash: { type: String, select: false },
      expiresAt: { type: Date },
    },
    completedAt: { type: Date },
    // Drafts that never reach payment clear themselves away (TTL index below).
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

registrationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
registrationSchema.index({ subscriber: 1, createdAt: -1 });
registrationSchema.index({ "parent.email": 1 });

export type RegistrationDocument = InferSchemaType<typeof registrationSchema>;

// The dev server re-runs this file when the schema changes without restarting;
// drop the model built from the old schema so new fields are saved.
if (process.env.NODE_ENV !== "production" && models.Registration) deleteModel("Registration");

export const Registration: Model<RegistrationDocument> =
  models.Registration ?? model<RegistrationDocument>("Registration", registrationSchema);
