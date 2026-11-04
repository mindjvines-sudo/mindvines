import { z } from "zod";
import { CONTENT_STATUSES } from "@/lib/constants";
import { seoInputSchema } from "@/validations/seo.schema";

export const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().trim().max(300).optional(),
  featuredImage: z.string().trim().optional(),
  status: z.enum(CONTENT_STATUSES).default("DRAFT"),
  seo: seoInputSchema.optional(),
});

export type PageInput = z.infer<typeof pageInputSchema>;
