import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";
import { contentLifecycleFields, seoSchema } from "@/models/shared";

/**
 * A website page. `kind: CMS` pages are built from sections and served by the
 * dynamic route; `kind: SYSTEM` pages live in code (home, plans, legal) and
 * only keep their SEO here. The top-level title/slug/sections/seo are the LIVE
 * content; everything an admin is working on sits in `draft` and reaches the
 * site only when published. Older pages (a single HTML `content`) keep working:
 * the renderer shows that HTML until the page is next published from the builder.
 */
const pageSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Legacy: a page saved before the builder existed. Not required for new pages.
    content: { type: String, default: "" },
    excerpt: { type: String, trim: true },
    featuredImage: { type: String, trim: true },
    seo: { type: seoSchema, default: () => ({}) },
    kind: { type: String, enum: ["CMS", "SYSTEM"], default: "CMS" },
    systemKey: { type: String, trim: true },
    template: { type: String, enum: ["DEFAULT", "NARROW", "LANDING"], default: "DEFAULT" },
    // Live sections and the live extras the shared `seo` subdocument has no place for.
    sections: { type: [Schema.Types.Mixed], default: [] },
    liveMeta: { type: Schema.Types.Mixed },
    // Work in progress; null when there is nothing unpublished.
    draft: { type: Schema.Types.Mixed, default: null },
    draftUpdatedAt: { type: Date },
    draftUpdatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    versionCounter: { type: Number, default: 0 },
    publishedVersion: { type: Number },
    // A version waiting for its date.
    scheduledVersion: { type: Number },
    publishAt: { type: Date },
    ...contentLifecycleFields,
    // Wider than the other content models: pages can be scheduled and unpublished.
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "SCHEDULED", "UNPUBLISHED", "ARCHIVED"], required: true, default: "DRAFT" },
  },
  { timestamps: true }
);

pageSchema.index({ systemKey: 1 }, { unique: true, partialFilterExpression: { systemKey: { $type: "string" } } });
pageSchema.index({ kind: 1, status: 1, publishAt: 1 });

pageSchema.index({ status: 1, publishedAt: -1 });

export type PageDocument = InferSchemaType<typeof pageSchema>;

// The dev server re-runs this file when the schema changes without restarting.
if (process.env.NODE_ENV !== "production" && models.Page) deleteModel("Page");

export const Page: Model<PageDocument> = models.Page ?? model<PageDocument>("Page", pageSchema);
