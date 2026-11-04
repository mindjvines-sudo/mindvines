import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { contentLifecycleFields, seoSchema } from "@/models/shared";

const pageSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    content: { type: String, required: true },
    excerpt: { type: String, trim: true },
    featuredImage: { type: String, trim: true },
    seo: { type: seoSchema, default: () => ({}) },
    ...contentLifecycleFields,
  },
  { timestamps: true }
);

pageSchema.index({ status: 1, publishedAt: -1 });

export type PageDocument = InferSchemaType<typeof pageSchema>;

export const Page: Model<PageDocument> = models.Page ?? model<PageDocument>("Page", pageSchema);
