import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { RegistrationError, RegistrationFieldError, saveRegistrationPreferences } from "@/services/registration.service";
import { registrationPreferencesSchema, savePreferencesRequestSchema } from "@/validations/registration.schema";

/** Page 2 of the registration form: the nickname and favourite topics, saved on the draft. */
export async function POST(request: Request) {
  const body = savePreferencesRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "We couldn't find your registration. Please start again." }, { status: 400 });
  const preferences = registrationPreferencesSchema.safeParse(body.data.preferences);
  if (!preferences.success) {
    return NextResponse.json({ error: "Please check your choices.", fields: preferences.error.flatten().fieldErrors }, { status: 400 });
  }

  if (!checkRateLimit(`registration:ip:${clientIp(request.headers)}`, { limit: 30, windowMs: 10 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    await saveRegistrationPreferences({ registrationId: body.data.registrationId, token: body.data.token, preferences: preferences.data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RegistrationFieldError) return NextResponse.json({ error: "Please check your choices.", fields: error.fields }, { status: 400 });
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "COMPLETED" ? 409 : 404 });
    console.error("Could not save preferences", error);
    return NextResponse.json({ error: "We couldn't save your choices. Please try again." }, { status: 500 });
  }
}
