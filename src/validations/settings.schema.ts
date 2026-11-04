import { z } from "zod";

export const settingsInputSchema = z.object({
  siteName: z.string().trim().min(1, "Site name is required").max(120),
  tagline: z.string().trim().max(160).optional(),
  contactEmail: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
});

export type SettingsInput = z.infer<typeof settingsInputSchema>;
