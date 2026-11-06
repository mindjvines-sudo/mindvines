import { z } from "zod";
import { findCountry, normalisePhone, phoneProblem, postalCodeProblem } from "@/lib/countries";

/** Whole years between a YYYY-MM-DD birthday and `now`. */
export function ageInYears(dob: string, now = new Date()) {
  const [year, month, day] = dob.split("-").map(Number);
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1;
  return age;
}

/** A real calendar date, for a child of school age. */
const dateOfBirth = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your child's date of birth")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid date")
  .refine((value) => {
    const age = ageInYears(value);
    return age >= 3 && age <= 17;
  }, "Check the date of birth: the programme is for children aged 6 to 12");

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

/** Page 1 of the registration form: the child, the parent, where to send the journals, and permissions. */
export const registrationDetailsSchema = z
  .object({
    childName: z.string().trim().min(1, "Enter your child's name").max(80),
    childDob: dateOfBirth,
    school: z.string().trim().min(2, "Enter the school's name").max(120),
    parentName: z.string().trim().min(2, "Enter your name").max(80, "Name is too long"),
    countryCode: z.string().trim().length(2, "Choose the country or region"),
    addressLine1: z.string().trim().min(5, "Enter the address").max(200, "The address is too long"),
    addressLine2: z.string().trim().max(200, "This is too long").optional().default(""),
    city: z.string().trim().min(2, "Enter the city").max(60),
    postalCode: z.string().trim().min(1, "Enter the postal code").max(12),
    phoneCountry: z.string().trim().length(2, "Choose the country code"),
    phone: z.string().trim().min(1, "Enter a mobile number").max(24),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
    acceptTerms: z.boolean().refine((value) => value, "Please accept the Terms & Conditions and Privacy Policy to continue"),
    allowFeature: z.boolean(),
    whatsappUpdates: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!findCountry(value.countryCode)) {
      context.addIssue({ code: "custom", path: ["countryCode"], message: "Choose the country or region" });
    } else {
      const postal = postalCodeProblem(value.countryCode, value.postalCode);
      if (postal) context.addIssue({ code: "custom", path: ["postalCode"], message: postal });
    }
    const phone = phoneProblem(value.phoneCountry, normalisePhone(value.phoneCountry, value.phone));
    if (phone) context.addIssue({ code: "custom", path: ["phone"], message: phone });
  })
  .transform((value) => ({
    ...value,
    countryCode: value.countryCode.toUpperCase(),
    phoneCountry: value.phoneCountry.toUpperCase(),
    phone: normalisePhone(value.phoneCountry, value.phone),
    postalCode: value.postalCode.toUpperCase(),
  }));

export type RegistrationDetailsInput = z.input<typeof registrationDetailsSchema>;
export type RegistrationDetails = z.output<typeof registrationDetailsSchema>;

/** Page 2: the nickname, and topic ids chosen per category id. The counts are checked against the programme's categories. */
export const registrationPreferencesSchema = z.object({
  nickname: z.string().trim().min(2, "Give your child a nickname").max(30, "Keep the nickname under 30 characters"),
  selections: z.record(objectId, z.array(objectId).max(50)),
});

export type RegistrationPreferences = z.infer<typeof registrationPreferencesSchema>;

const draftAccess = {
  registrationId: objectId,
  token: z.string().min(20).max(100),
};

/** Saving page 1: a new draft, or the browser's existing one. */
export const saveDetailsRequestSchema = z.object({
  registrationId: objectId.optional(),
  token: z.string().max(100).optional(),
  planId: objectId,
  details: z.unknown(),
});

export const savePreferencesRequestSchema = z.object({ ...draftAccess, preferences: z.unknown() });

/** Payment starts from the saved registration, never from what the browser sends again. */
export const startPaymentRequestSchema = z.object(draftAccess);
