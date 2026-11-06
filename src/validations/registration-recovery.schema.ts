import { z } from "zod";

export const recoveryRequestSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address")),
});

const challengeId = z.string().regex(/^[A-Za-z0-9_-]{32}$/);

export const recoveryVerifySchema = z.object({
  challengeId,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code from your email"),
});

export const recoverySelectSchema = z.object({
  challengeId,
  accessToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  registrationId: z.string().regex(/^[a-f\d]{24}$/i),
});
