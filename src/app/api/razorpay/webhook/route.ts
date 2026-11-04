import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { razorpayWebhookSecret } from "@/lib/razorpay";
import { verifyWebhookSignature } from "@/lib/razorpay-signature";
import { Payment } from "@/models/Payment";
import { WebhookEvent } from "@/models/WebhookEvent";
import { settlePayment } from "@/services/checkout.service";

type WebhookPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  error_description?: string | null;
};

type WebhookBody = {
  event?: string;
  payload?: { payment?: { entity?: WebhookPayment }; order?: { entity?: { id?: string } } };
};

/**
 * Razorpay's server-to-server notice. It settles payments the browser never
 * got to report (a closed tab, a lost connection) and is the safety net for
 * the checkout callback. The signature is checked against the exact bytes
 * received, and each delivery is processed once.
 */
export async function POST(request: Request) {
  const secret = razorpayWebhookSecret();
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set; webhook rejected");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhookSignature({ rawBody, signature, secret })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  const event = body.event ?? "";
  const rzp = body.payload?.payment?.entity;
  const orderId = rzp?.order_id ?? body.payload?.order?.entity?.id;
  if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

  await connectToDatabase();
  try {
    await WebhookEvent.create({ eventId, event, orderId: orderId ?? undefined });
  } catch (error) {
    // Already handled: acknowledge so Razorpay stops retrying.
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ received: true, duplicate: true });
    throw error;
  }

  try {
    if (rzp && orderId) {
      if (event === "payment.captured" || event === "order.paid") {
        await settlePayment({ orderId, razorpayPayment: rzp, via: "WEBHOOK", signatureVerified: true });
      } else if (event === "payment.failed") {
        await Payment.updateOne(
          { razorpayOrderId: orderId, status: { $in: ["CREATED", "PENDING", "CANCELLED"] } },
          { $set: { status: "FAILED", failureReason: rzp.error_description?.slice(0, 300) } }
        );
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    // Forget the delivery so Razorpay's retry gets another go.
    await WebhookEvent.deleteOne({ eventId });
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
