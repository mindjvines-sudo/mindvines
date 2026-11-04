import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const redirectSchema = new Schema(
  {
    from: { type: String, required: true, unique: true, trim: true },
    to: { type: String, required: true, trim: true },
    statusCode: { type: Number, enum: [301, 302], default: 301 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type RedirectDocument = InferSchemaType<typeof redirectSchema>;

export const Redirect: Model<RedirectDocument> =
  models.Redirect ?? model<RedirectDocument>("Redirect", redirectSchema);
