import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { RazorpayConfigError } from "@/lib/razorpay";
import { CheckoutError, createCheckoutOrder } from "@/services/checkout.service";
import { checkoutOrderSchema } from "@/validations/checkout.schema";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const limit = { limit: 10, windowMs: 10 * 60 * 1000 };
  if (!checkRateLimit(`checkout:ip:${clientIp(request.headers)}`, limit).allowed || !checkRateLimit(`checkout:email:${parsed.data.email}`, limit).allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    const { planId, ...details } = parsed.data;
    return NextResponse.json(await createCheckoutOrder(planId, details));
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof RazorpayConfigError) console.error("Checkout is not configured:", error.message);
    else console.error("Could not create checkout order", error);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again shortly." }, { status: 502 });
  }
}
