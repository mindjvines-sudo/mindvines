"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loginSchema } from "@/validations/auth.schema";
import { authenticate } from "@/services/auth.service";
import { logAction } from "@/services/audit.service";
import { createSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";

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

  const user = await authenticate(email, password);
  if (!user) {
    await logAction({ action: "LOGIN_FAILED", entity: "User", metadata: { email } });
    return { message: "Invalid email or password." };
  }

  await createSession(user.id, user.role);
  await logAction({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id });

  redirect("/admin/dashboard");
}
