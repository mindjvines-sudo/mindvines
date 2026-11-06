import { z } from "zod";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

export const programmeInputSchema = z.object({
  name: z.string().trim().min(1, "Programme name is required").max(80),
  ageGroup: z.enum(SUBSCRIPTION_AGE_GROUPS),
  description: z.string().trim().max(500).default(""),
  categories: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(10),
  displayOrder: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? 0 : value),
    z.coerce.number().pipe(z.number().int().min(0).max(10000)),
  ),
  active: z.boolean(),
});

export type ProgrammeInput = z.infer<typeof programmeInputSchema>;
