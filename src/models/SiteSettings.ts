import { Schema, deleteModel, model, models, type InferSchemaType, type Model } from "mongoose";

// Singleton collection — exactly one document is expected to exist.
const siteSettingsSchema = new Schema(
  {
    siteName: { type: String, required: true, trim: true },
    tagline: { type: String, trim: true },
    logo: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    subscriberNotificationEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    // The heading above the homepage's age group cards, set under Admin → Age Groups.
    ageGroupsHeading: { type: String, trim: true },
    // The header menu, in order. Unset means the built-in menu (see DEFAULT_MENU).
    menuItems: {
      type: [
        new Schema(
          {
            kind: { type: String, enum: ["link", "topics", "plans"], default: "link" },
            label: { type: String, required: true, trim: true, maxlength: 60 },
            href: { type: String, trim: true, maxlength: 300, default: "" },
            hidden: { type: Boolean, default: false },
            children: {
              type: [new Schema({
                ageGroup: { type: String, required: true },
                label: { type: String, trim: true, maxlength: 60 },
                href: { type: String, trim: true, maxlength: 300 },
              }, { _id: false })],
              default: undefined,
            },
          },
          { _id: false }
        ),
      ],
      default: undefined,
    },
    // The promotional popup shown on the public site (Admin → Popup Banner).
    promoPopup: {
      type: new Schema(
        {
          enabled: { type: Boolean, default: false },
          desktopImage: { type: Schema.Types.ObjectId, ref: "Media" },
          mobileImage: { type: Schema.Types.ObjectId, ref: "Media" },
          title: { type: String, trim: true, maxlength: 120, default: "" },
          description: { type: String, trim: true, maxlength: 400, default: "" },
          ctaLabel: { type: String, trim: true, maxlength: 40, default: "" },
          ctaUrl: { type: String, trim: true, maxlength: 300, default: "" },
          backgroundColor: { type: String, trim: true, default: "#fcf8f1" },
          overlayOpacity: { type: Number, min: 0, max: 90, default: 60 },
          delaySeconds: { type: Number, min: 0, max: 60, default: 3 },
          frequency: { type: String, enum: ["every", "session", "day", "visitor"], default: "session" },
          startsAt: { type: Date },
          endsAt: { type: Date },
          // Changes when a campaign is relaunched, so people who closed the old one see it again.
          version: { type: String, default: "1" },
        },
        { _id: false }
      ),
      default: undefined,
    },
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

if (process.env.NODE_ENV !== "production" && models.SiteSettings) deleteModel("SiteSettings");

export const SiteSettings: Model<SiteSettingsDocument> =
  models.SiteSettings ?? model<SiteSettingsDocument>("SiteSettings", siteSettingsSchema);
