import { z } from "zod";
import {
  PILOT_DISCOUNT_TYPES,
  PILOT_DURATIONS,
  PILOT_ELIGIBILITY_TYPES,
  PILOT_STATUSES,
  durationMonths,
  normaliseAccessCode,
  normaliseEmail,
  offerPrice,
} from "@/lib/pilot";

const numberInput = (schema: z.ZodNumber) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), z.coerce.number().pipe(schema));

const twoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
const objectId = z.string().regex(/^[a-f\d]{24}$/i);

/** The admin types calendar days; they are India's days, from the first minute to the last. */
const day = (end: boolean) =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Choose a valid date")
    .transform((value) => new Date(end ? `${value}T23:59:59.999+05:30` : `${value}T00:00:00+05:30`));

/**
 * What the admin submits for a pilot plan. The offer price and the months are
 * worked out here, never taken from the form, and the registration count is not
 * an input at all.
 */
export const pilotPlanInputSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a plan name").max(120),
    description: z.string().trim().max(1000).default(""),
    badgeEnabled: z.preprocess((value) => value === "true" ? true : value === "false" ? false : value, z.boolean().default(true)),
    badgeText: z.string().trim().max(40, "Keep the badge text under 40 characters").default(""),
    basePlan: objectId.refine(Boolean, "Choose the plan this pilot registers into"),
    duration: z.enum(PILOT_DURATIONS),
    customDuration: z.preprocess((value) => (value === "" || value === null ? undefined : value), z.coerce.number().int().min(1).max(120).optional()),
    originalPrice: numberInput(z.number().min(1, "Enter the original price").max(1000000).refine(twoDecimals, "Use at most two decimal places")),
    discountType: z.enum(PILOT_DISCOUNT_TYPES),
    discountValue: numberInput(z.number().min(0, "The discount can't be negative").max(1000000).refine(twoDecimals, "Use at most two decimal places")),
    maxRegistrations: numberInput(z.number().int("Use a whole number").min(1, "At least 1 registration").max(100000)),
    startDate: day(false),
    endDate: day(true),
    status: z.enum(PILOT_STATUSES),
    eligibilityType: z.enum(PILOT_ELIGIBILITY_TYPES),
    accessCode: z.string().trim().max(32).default("").transform(normaliseAccessCode),
    allowedEmails: z
      .string()
      .default("")
      .transform((value) => [...new Set(value.split(/[\s,;]+/).map(normaliseEmail).filter(Boolean))]),
    maxPerEmail: numberInput(z.number().int().min(0).max(100)),
    termsAndConditions: z.string().trim().max(5000).default(""),
  })
  .superRefine((value, context) => {
    if (value.duration === "CUSTOM" && !value.customDuration) {
      context.addIssue({ code: "custom", path: ["customDuration"], message: "Enter the number of months" });
    }
    if (value.discountType === "PERCENTAGE" && value.discountValue > 100) {
      context.addIssue({ code: "custom", path: ["discountValue"], message: "A percentage can't be more than 100" });
    }
    if (value.discountType === "FIXED" && value.discountValue >= value.originalPrice) {
      context.addIssue({ code: "custom", path: ["discountValue"], message: "The discount must be less than the original price" });
    }
    if (offerPrice(value.originalPrice, value.discountType, value.discountValue) < 1) {
      context.addIssue({ code: "custom", path: ["discountValue"], message: "The pilot price must be at least ₹1" });
    }
    if (value.endDate <= value.startDate) {
      context.addIssue({ code: "custom", path: ["endDate"], message: "The end date must be after the start date" });
    }
    if (value.accessCode && (value.accessCode.length < 4 || !/^[A-Z0-9-]+$/.test(value.accessCode))) {
      context.addIssue({ code: "custom", path: ["accessCode"], message: "Use 4 to 32 letters, numbers or hyphens" });
    }
    if (value.eligibilityType === "EMAIL_LIST") {
      if (value.allowedEmails.length === 0) context.addIssue({ code: "custom", path: ["allowedEmails"], message: "Add at least one approved email address" });
      const bad = value.allowedEmails.find((email) => !z.string().email().safeParse(email).success);
      if (bad) context.addIssue({ code: "custom", path: ["allowedEmails"], message: `"${bad}" is not a valid email address` });
      if (value.allowedEmails.length > 2000) context.addIssue({ code: "custom", path: ["allowedEmails"], message: "At most 2000 email addresses" });
    }
  })
  .transform((value) => ({
    ...value,
    durationMonths: durationMonths(value.duration, value.customDuration),
    offerPrice: offerPrice(value.originalPrice, value.discountType, value.discountValue),
  }));

export type PilotPlanInput = z.output<typeof pilotPlanInputSchema>;
export type PilotPlanFormValues = {
  name: string;
  description: string;
  badgeEnabled: boolean;
  badgeText: string;
  basePlan: string;
  duration: (typeof PILOT_DURATIONS)[number];
  customDuration?: number;
  originalPrice: number;
  discountType: (typeof PILOT_DISCOUNT_TYPES)[number];
  discountValue: number;
  maxRegistrations: number;
  startDate: string;
  endDate: string;
  status: (typeof PILOT_STATUSES)[number];
  eligibilityType: (typeof PILOT_ELIGIBILITY_TYPES)[number];
  accessCode: string;
  allowedEmails: string;
  maxPerEmail: number;
  termsAndConditions: string;
};

/** Public: opening a restricted pilot plan with its code. */
export const pilotAccessRequestSchema = z.object({ code: z.string().trim().min(4).max(32) });
