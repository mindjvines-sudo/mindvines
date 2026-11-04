import { z } from "zod";
import { CONTENT_STATUSES } from "@/lib/constants";

const text = (max: number) => z.string().trim().max(max).default("");
const title = z.object({ lead: text(120), accent: text(120) });

/** Paths a clinic can't take — they belong to other pages of the site. */
export const RESERVED_LOCATION_SLUGS = [
  "about",
  "admin",
  "api",
  "blog",
  "contact",
  "services",
  "sitemap.xml",
  "robots.txt",
  "manifest.webmanifest",
];

export const locationInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated")
    .refine((slug) => !RESERVED_LOCATION_SLUGS.includes(slug), "This address is used by another page"),
  title: z.string().trim().min(1, "Page title is required").max(120),
  eyebrow: text(120),
  heading: title,
  intro: text(1200),
  address: z.object({
    street: z.string().trim().min(1, "Street address is required").max(160),
    area: z.string().trim().min(1, "Area is required").max(80),
    city: z.string().trim().min(1, "City is required").max(80),
  }),
  phone: z.string().trim().min(1, "Phone is required").max(30),
  stats: z
    .array(z.object({ value: z.string().trim().min(1).max(12), label: z.string().trim().min(1).max(40) }))
    .max(3, "Up to 3 stats")
    .default([]),
  approach: z.object({ title, paragraphs: z.array(z.string().trim().min(1).max(1500)).max(6).default([]), image: z.string().trim().optional() }),
  services: z.object({ lead: text(120), accent: text(120), intro: text(600) }),
  serviceItems: z
    .array(
      z.object({
        title: z.string().trim().min(1, "Each service needs a title").max(80),
        description: text(300),
        href: z
          .string()
          .trim()
          .max(200)
          .refine((href) => href === "" || href.startsWith("/"), "Service links must start with /, e.g. /services/clinical-physiotherapy")
          .default(""),
      })
    )
    .max(18, "Up to 18 services")
    .default([]),
  conditionsTitle: title,
  conditions: z.array(z.string().trim().min(1).max(60)).max(60, "Up to 60 conditions").default([]),
  why: z.object({
    title,
    points: z
      .array(z.object({ title: z.string().trim().min(1, "Each reason needs a title").max(100), body: text(400) }))
      .max(8, "Up to 8 reasons")
      .default([]),
  }),
  corporate: z.object({ title: text(160), paragraphs: z.array(z.string().trim().min(1).max(1500)).max(6).default([]) }),
  faqTitle: title,
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(1, "Each FAQ needs a question").max(200),
        answer: z.string().trim().min(1, "Each FAQ needs an answer").max(2000),
      })
    )
    .max(20, "Up to 20 FAQs")
    .default([]),
  bannerImage: z.string().trim().optional(),
  teamImage: z.string().trim().optional(),
  corporateImage: z.string().trim().optional(),
  seo: z.object({
    title: z.string().trim().max(70, "SEO title: up to 70 characters").default(""),
    description: z.string().trim().max(160, "SEO description: up to 160 characters").default(""),
  }),
  status: z.enum(CONTENT_STATUSES).default("DRAFT"),
});

export type LocationInput = z.infer<typeof locationInputSchema>;
