import { z } from "zod";
import { CONTENT_STATUSES } from "@/lib/constants";

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .url("Enter a full link, starting with https://")
  .optional();

export const doctorInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  designation: z.string().trim().min(1, "Designation is required").max(120),
  qualifications: z.string().trim().max(160).optional(),
  experienceYears: z.coerce.number().int("Use whole years").min(0).max(80).optional(),
  bio: z.string().trim().max(1500).optional(),
  photo: z.string().trim().optional(),
  socialLinks: z.object({
    facebook: optionalUrl,
    x: optionalUrl,
    whatsapp: optionalUrl,
  }),
  status: z.enum(CONTENT_STATUSES).default("DRAFT"),
});

export type DoctorInput = z.infer<typeof doctorInputSchema>;
