import { z } from "zod";

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
