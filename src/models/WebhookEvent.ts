import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** One row per Razorpay webhook delivery already handled, so a retry is acknowledged and ignored. */
const webhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    event: { type: String, required: true },
    orderId: { type: String },
    // Webhook records are only needed while Razorpay might still retry.
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
  },
  { versionKey: false }
);

export type WebhookEventDocument = InferSchemaType<typeof webhookEventSchema>;

export const WebhookEvent: Model<WebhookEventDocument> =
  models.WebhookEvent ?? model<WebhookEventDocument>("WebhookEvent", webhookEventSchema);
