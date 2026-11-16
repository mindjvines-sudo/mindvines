import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A permanent redirect left behind when a published page's address changes, so old links and search results keep working. */
const redirectSchema = new Schema(
  {
    from: { type: String, required: true, unique: true, lowercase: true, trim: true },
    to: { type: String, required: true, lowercase: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export type RedirectDocument = InferSchemaType<typeof redirectSchema>;

export const Redirect: Model<RedirectDocument> = models.Redirect ?? model<RedirectDocument>("Redirect", redirectSchema);
