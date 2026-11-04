import { z } from "zod";

export const enquiryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  subject: z.string().trim().max(150).optional(),
  // The home page "Let's Connect" form asks for the child's age and, like
  // the live site, leaves the message optional.
  childAge: z.string().trim().max(20).optional(),
  message: z.string().trim().max(2000).optional(),
  // Honeypot: real users never see or fill this field; bots that
  // autofill every input do. Non-empty means "reject silently".
  company: z.string().max(0, "Spam detected").optional().or(z.literal("")),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
