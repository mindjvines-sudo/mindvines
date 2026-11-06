import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const schema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

type RecoveryRateLimitDocument = InferSchemaType<typeof schema>;
export const RecoveryRateLimit: Model<RecoveryRateLimitDocument> =
  models.RecoveryRateLimit ?? model<RecoveryRateLimitDocument>("RecoveryRateLimit", schema);
