import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { normaliseReference } from "@/lib/renewal";
import { RenewalError, lookupRenewal } from "@/services/renewal.service";

const bodySchema = z.object({
  reference: z.string().trim().min(3, "Enter your registration number").max(20),
  contact: z.string().trim().min(3, "Enter the email or mobile number you registered with").max(120),
});

/** Renewing, step 1: registration number + email or mobile → the plans this child can renew with. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  // Slows down anyone trying registration numbers one after another.
  const windowMs = 15 * 60 * 1000;
  const reference = normaliseReference(parsed.data.reference);
  if (
    !checkRateLimit(`renewal:ip:${clientIp(request.headers)}`, { limit: 10, windowMs }).allowed ||
    !checkRateLimit(`renewal:ref:${reference}`, { limit: 6, windowMs }).allowed
  ) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    return NextResponse.json(await lookupRenewal(parsed.data.reference, parsed.data.contact));
  } catch (error) {
    if (error instanceof RenewalError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "NOT_FOUND" ? 404 : 409 });
    console.error("Renewal lookup failed", error);
    return NextResponse.json({ error: "We couldn't look up your registration. Please try again." }, { status: 500 });
  }
}
