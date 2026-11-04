import { z } from "zod";
import { CONTENT_STATUSES } from "@/lib/constants";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

const numberInput = (schema: z.ZodNumber) =>
  z.preprocess((value) => value === "" || value === null ? undefined : value, z.coerce.number().pipe(schema));

export const subscriptionInputSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(1000),
  ageGroup: z.enum(SUBSCRIPTION_AGE_GROUPS),
  price: numberInput(z.number().min(0).max(1000000).refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Use at most two decimal places",
  )),
  durationMonths: numberInput(z.number().int().min(1).max(120)),
  journalCount: numberInput(z.number().int().min(1).max(1000)),
  features: z.array(z.string().trim().min(1).max(200)).max(20),
  registrationUrl: z.string().trim().max(2000).refine((value) => {
    if (!value) return true;
    if (value.startsWith("/")) return /^\/(?!\/)[^\\\s]*$/.test(value);
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Enter an http(s) URL or a path starting with /"),
  badge: z.string().trim().max(30).default(""),
  buttonLabel: z.string().trim().max(40).default(""),
  featured: z.boolean(),
  displayOrder: numberInput(z.number().int().min(0).max(10000)),
  status: z.enum(CONTENT_STATUSES),
});

export type SubscriptionInput = z.infer<typeof subscriptionInputSchema>;
