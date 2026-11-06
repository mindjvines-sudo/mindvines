import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { RazorpayConfigError } from "@/lib/razorpay";
import { CheckoutError, createCheckoutOrder } from "@/services/checkout.service";
import { RegistrationError, RegistrationFieldError } from "@/services/registration.service";
import { startPaymentRequestSchema } from "@/validations/registration.schema";

/** Page 3: opens a Razorpay order for a saved registration. Prices and details come from the server's own records. */
export async function POST(request: Request) {
  const parsed = startPaymentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "We couldn't find your registration. Please start again." }, { status: 400 });

  const limit = { limit: 10, windowMs: 10 * 60 * 1000 };
  if (!checkRateLimit(`checkout:ip:${clientIp(request.headers)}`, limit).allowed || !checkRateLimit(`checkout:reg:${parsed.data.registrationId}`, limit).allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    return NextResponse.json(await createCheckoutOrder(parsed.data.registrationId, parsed.data.token));
  } catch (error) {
    if (error instanceof RegistrationFieldError) return NextResponse.json({ error: error.message, fields: error.fields }, { status: 400 });
    if (error instanceof RegistrationError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "COMPLETED" ? 409 : 404 });
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof RazorpayConfigError) console.error("Checkout is not configured:", error.message);
    else console.error("Could not create checkout order", error);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again shortly." }, { status: 502 });
  }
}
