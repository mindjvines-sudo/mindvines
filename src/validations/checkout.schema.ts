import { z } from "zod";

/** Indian mobile numbers, with or without +91 or a leading 0; stored as ten digits. */
const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, "").replace(/^(\+?91|0)(?=\d{10}$)/, ""))
  .refine((value) => /^[6-9]\d{9}$/.test(value), "Enter a valid 10-digit mobile number");

export const checkoutDetailsSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  phone,
  childName: z.string().trim().min(1, "Enter your child's name").max(80),
  childAge: z.string().trim().min(1, "Enter your child's age").max(2).regex(/^\d{1,2}$/, "Enter an age in years"),
});

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>;

export const checkoutOrderSchema = checkoutDetailsSchema.extend({
  planId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a plan"),
});

export const checkoutVerifySchema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

export const checkoutOutcomeSchema = z.object({
  orderId: z.string().min(1).max(64),
  outcome: z.enum(["failed", "cancelled"]),
  reason: z.string().max(300).optional(),
});
