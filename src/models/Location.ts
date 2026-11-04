import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CONTENT_STATUSES } from "@/lib/constants";

const titleSchema = { lead: { type: String, trim: true }, accent: { type: String, trim: true } };

/**
 * A clinic, managed under Admin → Locations. Each published one has its own
 * page at /[slug] and an entry in the header's Locations menu. The fields
 * mirror the `Location` content type (lib/content.ts), which the built-in
 * clinics also use.
 */
const locationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    eyebrow: { type: String, trim: true },
    heading: titleSchema,
    intro: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, trim: true },
    },
    phone: { type: String, trim: true },
    stats: { type: [{ value: String, label: String }], default: [] },
    approach: {
      title: titleSchema,
      paragraphs: { type: [String], default: [] },
      image: { type: Schema.Types.ObjectId, ref: "Media" },
    },
    services: {
      lead: { type: String, trim: true },
      accent: { type: String, trim: true },
      intro: { type: String, trim: true },
    },
    serviceItems: { type: [{ title: String, description: String, href: String }], default: [] },
    conditionsTitle: titleSchema,
    conditions: { type: [String], default: [] },
    why: {
      title: titleSchema,
      points: { type: [{ title: String, body: String }], default: [] },
    },
    corporate: {
      title: { type: String, trim: true },
      paragraphs: { type: [String], default: [] },
    },
    faqTitle: titleSchema,
    faqs: { type: [{ question: String, answer: String }], default: [] },
    bannerImage: { type: Schema.Types.ObjectId, ref: "Media" },
    teamImage: { type: Schema.Types.ObjectId, ref: "Media" },
    corporateImage: { type: Schema.Types.ObjectId, ref: "Media" },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    },
    displayOrder: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: "DRAFT" },
  },
  { timestamps: true }
);

locationSchema.index({ status: 1, displayOrder: 1 });

export type LocationDocument = InferSchemaType<typeof locationSchema>;

export const Location: Model<LocationDocument> =
  models.Location ?? model<LocationDocument>("Location", locationSchema);
