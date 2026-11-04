import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const tagSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

export type TagDocument = InferSchemaType<typeof tagSchema>;

export const Tag: Model<TagDocument> = models.Tag ?? model<TagDocument>("Tag", tagSchema);
