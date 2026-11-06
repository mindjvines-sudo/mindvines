import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { RazorpayConfigError } from "@/lib/razorpay";
import { CheckoutError, createRenewalOrder } from "@/services/checkout.service";
import { RegistrationFieldError } from "@/services/registration.service";
import { RenewalError } from "@/services/renewal.service";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const bodySchema = z.object({
  registrationId: objectId,
  token: z.string().min(20).max(100),
  planId: objectId,
  selections: z.record(objectId, z.array(objectId).max(50)).default({}),
});

/** Renewing, step 2: a Razorpay order for the chosen plan, priced on the server. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please look up your registration again." }, { status: 400 });

  const limit = { limit: 10, windowMs: 10 * 60 * 1000 };
  if (!checkRateLimit(`checkout:ip:${clientIp(request.headers)}`, limit).allowed || !checkRateLimit(`checkout:reg:${parsed.data.registrationId}`, limit).allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    return NextResponse.json(await createRenewalOrder(parsed.data));
  } catch (error) {
    if (error instanceof RegistrationFieldError) return NextResponse.json({ error: "Please choose the topics for your new programme.", fields: error.fields }, { status: 400 });
    if (error instanceof RenewalError) return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof RazorpayConfigError) console.error("Checkout is not configured:", error.message);
    else console.error("Could not create renewal order", error);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again shortly." }, { status: 502 });
  }
}
