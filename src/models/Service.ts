import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { contentLifecycleFields, seoSchema } from "@/models/shared";

/**
 * A physiotherapy service, managed under Admin → Services and published at
 * /services/[slug]. Beyond the card fields (name, summary, icon, image) each
 * service carries the sections of its detail page: a rich-text overview, a
 * list of benefits, the treatment process and its own FAQs.
 */
const serviceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tagline: { type: String, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    /** One of the built-in line icons in /public/icons/physio-departments. */
    icon: { type: String, trim: true },
    image: { type: Schema.Types.ObjectId, ref: "Media" },
    bannerImage: { type: Schema.Types.ObjectId, ref: "Media" },
    features: { type: [String], default: [] },
    process: {
      type: [{ title: { type: String, trim: true }, description: { type: String, trim: true } }],
      default: [],
    },
    faqs: {
      type: [{ question: { type: String, trim: true }, answer: { type: String, trim: true } }],
      default: [],
    },
    displayOrder: { type: Number, default: 0 },
    seo: { type: seoSchema, default: () => ({}) },
    ...contentLifecycleFields,
  },
  { timestamps: true }
);

serviceSchema.index({ status: 1, displayOrder: 1 });

export type ServiceDocument = InferSchemaType<typeof serviceSchema>;

export const Service: Model<ServiceDocument> =
  models.Service ?? model<ServiceDocument>("Service", serviceSchema);
