import { z } from "zod";
import { CONTENT_STATUSES } from "@/lib/constants";
import { isServiceIcon } from "@/lib/service-icons";
import { seoInputSchema } from "@/validations/seo.schema";

const processStepSchema = z.object({
  title: z.string().trim().min(1, "Each step needs a title").max(120),
  description: z.string().trim().max(400).default(""),
});

const faqSchema = z.object({
  question: z.string().trim().min(1, "Each FAQ needs a question").max(200),
  answer: z.string().trim().min(1, "Each FAQ needs an answer").max(1500),
});

export const serviceInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated"),
  tagline: z.string().trim().max(160).optional(),
  shortDescription: z.string().trim().min(1, "A short description is required").max(240),
  description: z
    .string()
    .refine((html) => html.replace(/<[^>]+>/g, "").trim().length > 0, "The overview is required"),
  icon: z
    .string()
    .trim()
    .refine(isServiceIcon, "Choose one of the listed icons")
    .optional(),
  image: z.string().trim().optional(),
  bannerImage: z.string().trim().optional(),
  features: z.array(z.string().trim().min(1).max(200)).max(20, "Up to 20 benefits").default([]),
  process: z.array(processStepSchema).max(10, "Up to 10 steps").default([]),
  faqs: z.array(faqSchema).max(20, "Up to 20 FAQs").default([]),
  status: z.enum(CONTENT_STATUSES).default("DRAFT"),
  seo: seoInputSchema.optional(),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;
