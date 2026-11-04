import "server-only";

const API = "https://api.razorpay.com/v1";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) throw new RazorpayConfigError("Razorpay keys are not configured");
  return { keyId, keySecret };
}

export class RazorpayConfigError extends Error {}

export function razorpayKeyId(): string {
  return credentials().keyId;
}

export function razorpayKeySecret(): string {
  return credentials().keySecret;
}

export function razorpayWebhookSecret(): string | undefined {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || undefined;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
  });
  if (!response.ok) throw new Error(`Razorpay ${path} responded ${response.status}`);
  return (await response.json()) as T;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

export type RazorpayPayment = {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  error_description?: string | null;
};

/** The amount is in paise. `receipt` is ours, up to 40 characters. */
export function createRazorpayOrder(params: { amount: number; receipt: string; notes: Record<string, string> }) {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: params.amount, currency: "INR", receipt: params.receipt, notes: params.notes }),
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}
