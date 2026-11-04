import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A paying customer. Created only once a payment has been verified, and
 * looked up by email afterwards so a renewal never makes a second record.
 * Not to be confused with `User`, which is an admin login.
 */
const subscriberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    childName: { type: String, trim: true },
    childAge: { type: String, trim: true },
  },
  { timestamps: true }
);

subscriberSchema.index({ name: 1 });
subscriberSchema.index({ phone: 1 });

export type SubscriberDocument = InferSchemaType<typeof subscriberSchema>;

export const Subscriber: Model<SubscriberDocument> =
  models.Subscriber ?? model<SubscriberDocument>("Subscriber", subscriberSchema);
