import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

// Singleton collection — exactly one document is expected to exist.
const siteSettingsSchema = new Schema(
  {
    siteName: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true },
    logo: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    socialLinks: {
      type: Map,
      of: String,
      default: undefined,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export type SiteSettingsDocument = InferSchemaType<typeof siteSettingsSchema>;

export const SiteSettings: Model<SiteSettingsDocument> =
  models.SiteSettings ?? model<SiteSettingsDocument>("SiteSettings", siteSettingsSchema);
