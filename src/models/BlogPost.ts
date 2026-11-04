import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { contentLifecycleFields, seoSchema } from "@/models/shared";

const blogPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, trim: true },
    content: { type: String, required: true },
    featuredImage: { type: Schema.Types.ObjectId, ref: "Media" },
    author: { type: Schema.Types.ObjectId, ref: "User" },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    tags: { type: [Schema.Types.ObjectId], ref: "Tag", default: [] },
    readingTime: { type: Number },
    seo: { type: seoSchema, default: () => ({}) },
    ...contentLifecycleFields,
  },
  { timestamps: true }
);

blogPostSchema.index({ status: 1, publishedAt: -1 });

export type BlogPostDocument = InferSchemaType<typeof blogPostSchema>;

export const BlogPost: Model<BlogPostDocument> =
  models.BlogPost ?? model<BlogPostDocument>("BlogPost", blogPostSchema);
