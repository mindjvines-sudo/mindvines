import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { NotServiceableError } from "@/services/location.service";
import { RegistrationError, RegistrationFieldError, saveRegistrationDetails } from "@/services/registration.service";
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
    const { registrationId, token, planId, pilotPlanId, accessCode } = body.data;
    return NextResponse.json(
      await saveRegistrationDetails({ registrationId, token, planId, details: details.data, pilot: pilotPlanId ? { pilotPlanId, accessCode } : undefined })
    );
  } catch (error) {
    // Not a place we register from: refused here, whatever the browser's form did.
    if (error instanceof NotServiceableError) {
      return NextResponse.json({ error: error.message, code: "NOT_SERVICEABLE", fields: { postalCode: [error.message] } }, { status: 403 });
    }
    if (error instanceof RegistrationFieldError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 });
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "PILOT_UNAVAILABLE" ? 403 : 409 });
    console.error("Could not save registration", error);
    return NextResponse.json({ error: "We couldn't save your details. Please try again." }, { status: 500 });
  }
}
