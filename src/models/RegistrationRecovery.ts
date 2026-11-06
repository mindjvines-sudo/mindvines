import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// One current challenge per email. Codes and browser access tokens are never stored in plain text.
const schema = new Schema({
  _id: { type: String, required: true },
  email: { type: String, required: true },
  challengeId: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  lastRequestedAt: { type: Date, required: true },
  attempts: { type: Number, required: true, default: 0 },
  deliveredAt: Date,
  usedAt: Date,
  accessTokenHash: { type: String, select: false },
  accessExpiresAt: Date,
  deleteAfter: { type: Date, required: true },
});
schema.index({ deleteAfter: 1 }, { expireAfterSeconds: 0 });

export type RegistrationRecoveryDocument = InferSchemaType<typeof schema>;
export const RegistrationRecovery: Model<RegistrationRecoveryDocument> =
  models.RegistrationRecovery ?? model<RegistrationRecoveryDocument>("RegistrationRecovery", schema);
