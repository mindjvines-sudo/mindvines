import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { contentLifecycleFields, seoSchema } from "@/models/shared";

const projectSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    client: { type: String, trim: true },
    location: { type: String, trim: true },
    category: { type: String, trim: true },
    description: { type: String, required: true },
    gallery: { type: [String], default: [] },
    seo: { type: seoSchema, default: () => ({}) },
    ...contentLifecycleFields,
  },
  { timestamps: true }
);

projectSchema.index({ status: 1, publishedAt: -1 });

export type ProjectDocument = InferSchemaType<typeof projectSchema>;

export const Project: Model<ProjectDocument> =
  models.Project ?? model<ProjectDocument>("Project", projectSchema);
