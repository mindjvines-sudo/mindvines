"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema } from "@/validations/auth.schema";
import { authenticate } from "@/services/auth.service";
import { logAuthenticationEvent } from "@/services/audit.service";
import { createSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportAuthFailure } from "@/lib/auth-errors";

export type LoginFormState = {
  errors?: { email?: string[]; password?: string[] };
  message?: string;
} | undefined;

const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 5 * 60 * 1000 };

export async function login(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  const rateLimit = checkRateLimit(`login:${ip}:${email}`, LOGIN_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return { message: "Too many login attempts. Please try again in a few minutes." };
  }

  const missing = ["MONGODB_URI", "SESSION_SECRET"].filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error("[admin-auth] Missing server environment variables", { missing });
    return { message: "Sign-in is temporarily unavailable. Please contact the site administrator." };
  }

  let user;
  try {
    user = await authenticate(email, password);
  } catch (error) {
    reportAuthFailure("database", error);
    return { message: "Unable to sign in right now. Please try again shortly." };
  }
  if (!user) {
    await logAuthenticationEvent({ action: "LOGIN_FAILED", entity: "User", metadata: { email } });
    return { message: "Invalid email or password." };
  }

  try {
    await createSession(user.id, user.role);
  } catch (error) {
    reportAuthFailure("session", error);
    return { message: "Unable to start your session. Please try again shortly." };
  }
  await logAuthenticationEvent({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id });

  redirect("/admin/dashboard");
}
