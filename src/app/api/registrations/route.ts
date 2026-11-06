import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { RegistrationError, saveRegistrationDetails } from "@/services/registration.service";
import { registrationDetailsSchema, saveDetailsRequestSchema } from "@/validations/registration.schema";

/** Page 1 of the registration form: saves (or updates) the draft and returns its id and secret token. */
export async function POST(request: Request) {
  const body = saveDetailsRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Please check your details." }, { status: 400 });
  const details = registrationDetailsSchema.safeParse(body.data.details);
  if (!details.success) {
    return NextResponse.json({ error: "Please check your details.", fields: details.error.flatten().fieldErrors }, { status: 400 });
  }

  if (!checkRateLimit(`registration:ip:${clientIp(request.headers)}`, { limit: 30, windowMs: 10 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    const { registrationId, token, planId } = body.data;
    return NextResponse.json(await saveRegistrationDetails({ registrationId, token, planId, details: details.data }));
  } catch (error) {
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    console.error("Could not save registration", error);
    return NextResponse.json({ error: "We couldn't save your details. Please try again." }, { status: 500 });
  }
}
