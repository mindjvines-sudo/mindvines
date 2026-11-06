import { z } from "zod";
import { TOPIC_PICKS } from "@/lib/topics";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Choose a category");

export const topicInputSchema = z.object({
  title: z.string().trim().min(1, "Topic is required").max(160),
  category: objectId,
  active: z.boolean(),
});

export type TopicInput = z.infer<typeof topicInputSchema>;

export const topicCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  heading: z.string().trim().min(1, "Heading is required").max(120),
  description: z.string().trim().max(500).default(""),
  selectionLimit: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? TOPIC_PICKS : value),
    z.coerce.number().pipe(z.number().int().min(1, "At least 1").max(50, "At most 50")),
  ),
  displayOrder: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : value),
    z.coerce.number().pipe(z.number().int().min(0).max(10000)),
  ),
  active: z.boolean(),
});

export type TopicCategoryInput = z.infer<typeof topicCategoryInputSchema>;

export const topicVersionNameSchema = z.string().trim().min(1, "Give the version a name, such as “2027 Q1”").max(60);
