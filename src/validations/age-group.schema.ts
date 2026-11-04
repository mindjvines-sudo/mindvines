import { z } from "zod";
import { CONTENT_STATUSES } from "@/lib/constants";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

const text = (max: number) => z.string().trim().max(max).default("");
const required = (message: string, max: number) => z.string().trim().min(1, message).max(max);

/** An image picker posts a Media id, or "" when left empty. */
const image = z
  .union([z.string().trim().regex(/^[a-f\d]{24}$/i, "Choose an image from the media library"), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

const link = z
  .string()
  .trim()
  .max(300)
  .refine((href) => href === "" || /^(\/|#|https?:\/\/)/.test(href), "Links must start with /, # or https://")
  .default("");

const slide = z
  .object({ image, caption: text(160) })
  .refine((value) => value.image, { message: "Each slide needs an image", path: ["image"] });

/** Tags are typed as one comma-separated line. */
const tags = z.preprocess(
  (value) => (typeof value === "string" ? value.split(",").map((tag) => tag.trim()).filter(Boolean) : value),
  z.array(z.string().max(40, "Tags: up to 40 characters each")).max(12, "Up to 12 tags").default([])
);

/** The rating select posts "" for no rating. */
const rating = z.preprocess(
  (value) => (value === "" || value == null ? undefined : Number(value)),
  z.number().int().min(1).max(5).optional()
);

export const ageGroupInputSchema = z.object({
  title: required("Title is required", 60),
  slug: z
    .string()
    .trim()
    .min(1, "Page address is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only"),
  subtitle: text(80),
  summary: text(400),
  cardImage: image,
  hero: z.object({ heading: text(120), subheading: text(240), image }),
  highlights: z.object({
    heading: text(120),
    intro: text(300),
    slides: z.array(slide).max(12, "Up to 12 topics").default([]),
    note: text(120),
    cta: z.object({ label: text(40), href: link }),
  }),
  collections: z
    .array(
      z.object({
        heading: required("Each collection needs a heading", 120),
        subheading: text(160),
        tags,
        items: z
          .array(z.object({ title: required("Each row needs a title", 100), body: text(600), image }))
          .max(8, "Up to 8 rows in a collection")
          .default([]),
      })
    )
    .max(4, "Up to 4 collections")
    .default([]),
  stats: z.object({
    heading: text(120),
    image,
    items: z
      .array(z.object({ value: required("Each stat needs a figure", 12), label: required("Each stat needs a label", 40) }))
      .max(4, "Up to 4 stats")
      .default([]),
  }),
  plans: z.object({
    show: z.boolean().default(true),
    ageGroup: z.union([z.enum(SUBSCRIPTION_AGE_GROUPS), z.literal("")]).default(""),
    heading: text(120),
    intro: text(600),
    priceNote: text(60),
    footnote: text(120),
  }),
  gallery: z.object({
    heading: text(120),
    tabs: z
      .array(
        z.object({
          label: required("Each tab needs a name", 40),
          slides: z.array(slide).min(1, "Each tab needs at least one image").max(12, "Up to 12 images in a tab"),
        })
      )
      .max(6, "Up to 6 tabs")
      .default([]),
  }),
  testimonials: z.object({
    heading: text(120),
    items: z
      .array(
        z.object({
          name: required("Each testimonial needs a name", 80),
          detail: text(120),
          quote: required("Each testimonial needs a quote", 600),
          rating,
          image,
        })
      )
      .max(12, "Up to 12 testimonials")
      .default([]),
  }),
  seo: z.object({
    title: z.string().trim().max(70, "SEO title: up to 70 characters").default(""),
    description: z.string().trim().max(160, "SEO description: up to 160 characters").default(""),
  }),
  status: z.enum(CONTENT_STATUSES).default("DRAFT"),
});

export type AgeGroupInput = z.infer<typeof ageGroupInputSchema>;
