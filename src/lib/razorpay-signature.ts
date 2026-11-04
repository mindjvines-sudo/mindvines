import { createHmac, timingSafeEqual } from "node:crypto";

function matches(expected: string, given: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Checkout's signature: HMAC-SHA256 of "order_id|payment_id" with the API key secret. */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = createHmac("sha256", params.secret).update(`${params.orderId}|${params.paymentId}`).digest("hex");
  return matches(expected, params.signature);
}

/** A webhook's signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyWebhookSignature(params: { rawBody: string; signature: string; secret: string }): boolean {
  const expected = createHmac("sha256", params.secret).update(params.rawBody).digest("hex");
  return matches(expected, params.signature);
}
