import { Schema } from "mongoose";
import { CONTENT_STATUSES } from "@/lib/constants";

// Reused by every indexable content model (Page, Service, Project, BlogPost)
// so SEO fields and the draft/published/archived lifecycle stay consistent.
export const seoSchema = new Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    canonical: { type: String, trim: true },
    keywords: { type: [String], default: [] },
    ogTitle: { type: String, trim: true },
    ogDescription: { type: String, trim: true },
    ogImage: { type: String, trim: true },
    robots: { type: String, trim: true },
  },
  { _id: false }
);

export const contentLifecycleFields = {
  status: { type: String, enum: CONTENT_STATUSES, required: true, default: "DRAFT" },
  publishedAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
} as const;
