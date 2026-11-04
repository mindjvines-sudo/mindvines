import { NextResponse } from "next/server";
import { CheckoutError, confirmCheckoutPayment } from "@/services/checkout.service";
import { checkoutVerifySchema } from "@/validations/checkout.schema";

/**
 * The browser says a payment went through; this checks it. The response says
 * only whether the server has confirmed it. The page's own success state is
 * never what activates a subscription.
 */
export async function POST(request: Request) {
  const parsed = checkoutVerifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const status = await confirmCheckoutPayment({
      orderId: parsed.data.razorpay_order_id,
      paymentId: parsed.data.razorpay_payment_id,
      signature: parsed.data.razorpay_signature,
    });
    if (status === "paid") return NextResponse.json({ status: "paid" });
    if (status === "pending") return NextResponse.json({ status: "pending" });
    return NextResponse.json({ status: "failed", error: "We couldn't confirm this payment. If money was taken, it will be matched to your order shortly." }, { status: 409 });
  } catch (error) {
    if (error instanceof CheckoutError) return NextResponse.json({ status: "failed", error: error.message }, { status: 400 });
    console.error("Payment verification failed", error);
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }
}
