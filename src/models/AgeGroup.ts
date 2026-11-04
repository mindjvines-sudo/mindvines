import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { CONTENT_STATUSES } from "@/lib/constants";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

const image = { type: Schema.Types.ObjectId, ref: "Media" };
const slide = { image, caption: { type: String, trim: true } };

/**
 * An age group, managed under Admin → Age Groups. Each published one is a
 * card in the homepage's age groups section and has its own page at
 * /age-groups/[slug], whose sections run top to bottom in the order below.
 */
const ageGroupSchema = new Schema(
  {
    // The homepage card
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subtitle: { type: String, trim: true },
    summary: { type: String, trim: true },
    cardImage: image,

    // The page
    hero: {
      heading: { type: String, trim: true },
      subheading: { type: String, trim: true },
      image,
    },
    // The topics grid
    highlights: {
      heading: { type: String, trim: true },
      intro: { type: String, trim: true },
      slides: { type: [slide], default: [] },
      note: { type: String, trim: true },
      cta: { label: { type: String, trim: true }, href: { type: String, trim: true } },
    },
    collections: {
      type: [
        {
          heading: String,
          subheading: String,
          tags: { type: [String], default: [] },
          items: { type: [{ title: String, body: String, image }], default: [] },
        },
      ],
      default: [],
    },
    stats: {
      heading: { type: String, trim: true },
      image,
      items: { type: [{ value: String, label: String }], default: [] },
    },
    // The plan switcher: one tab for each published plan of the chosen age
    // group in Subscriptions, over a single plan card.
    plans: {
      show: { type: Boolean, default: true },
      // Which Subscriptions plans to list; empty hides the section.
      ageGroup: { type: String, enum: [...SUBSCRIPTION_AGE_GROUPS, ""], default: "" },
      heading: { type: String, trim: true },
      intro: { type: String, trim: true },
      priceNote: { type: String, trim: true },
      footnote: { type: String, trim: true },
    },
    gallery: {
      heading: { type: String, trim: true },
      tabs: { type: [{ label: String, slides: { type: [slide], default: [] } }], default: [] },
    },
    testimonials: {
      heading: { type: String, trim: true },
      items: {
        type: [{ name: String, detail: String, quote: String, rating: { type: Number, min: 1, max: 5 }, image }],
        default: [],
      },
    },

    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    },
    displayOrder: { type: Number, default: 0 },
    status: { type: String, enum: CONTENT_STATUSES, required: true, default: "DRAFT" },
  },
  { timestamps: true }
);

ageGroupSchema.index({ status: 1, displayOrder: 1 });

export type AgeGroupDocument = InferSchemaType<typeof ageGroupSchema>;

export const AgeGroup: Model<AgeGroupDocument> = models.AgeGroup ?? model<AgeGroupDocument>("AgeGroup", ageGroupSchema);

/** Every path holding a Media reference, for populating and for the media library's in-use check. */
export const AGE_GROUP_IMAGE_PATHS = [
  "cardImage",
  "hero.image",
  "highlights.slides.image",
  "collections.items.image",
  "stats.image",
  "gallery.tabs.slides.image",
  "testimonials.items.image",
] as const;
