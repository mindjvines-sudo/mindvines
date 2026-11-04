import { z } from "zod";
import { CONTENT_STATUSES } from "@/lib/constants";
import { seoInputSchema } from "@/validations/seo.schema";

export const blogPostInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated"),
  excerpt: z.string().trim().max(300).optional(),
  content: z.string().min(1, "Content is required"),
  featuredImage: z.string().trim().optional(),
  status: z.enum(CONTENT_STATUSES).default("DRAFT"),
  seo: seoInputSchema.optional(),
});

export type BlogPostInput = z.infer<typeof blogPostInputSchema>;
