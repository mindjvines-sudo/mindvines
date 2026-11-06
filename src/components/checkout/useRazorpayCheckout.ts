"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PaymentOutcome = null | "paid" | "pending" | "failed" | "cancelled";
export type RazorpayOrder = { orderId: string; keyId: string; amount: number; currency: string };

type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function postJson(path: string, body: unknown) {
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: response.ok, status: response.status, data: (await response.json().catch(() => ({}))) as Record<string, unknown> };
}

/**
 * Razorpay Checkout for an order the server has made. The browser's result is
 * only a hint: the server verifies the signature and reads the payment back
 * before anything is activated. A payment still being confirmed is checked
 * again until the server has settled it. `onPaid` runs once, on success.
 */
export function useRazorpayCheckout(onPaid?: () => void) {
  const [outcome, setOutcome] = useState<PaymentOutcome>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const orderRef = useRef<string | null>(null);
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  });

  const finish = useCallback((next: PaymentOutcome, text = "") => {
    setBusy(false);
    setMessage(text);
    setOutcome(next);
    if (next === "paid") onPaidRef.current?.();
  }, []);

  useEffect(() => {
    if (outcome !== "pending" || !orderRef.current) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const response = await fetch(`/api/checkout/status?order=${orderRef.current}`, { cache: "no-store" }).catch(() => null);
      const status = response?.ok ? ((await response.json()) as { status?: string }).status : undefined;
      if (status === "PAID") finish("paid");
      else if (status === "FAILED") finish("failed", "The payment did not go through.");
      if (status === "PAID" || status === "FAILED" || tries >= 30) clearInterval(timer);
    }, 4000);
    return () => clearInterval(timer);
  }, [outcome, finish]);

  const open = useCallback(
    async (order: RazorpayOrder, options: { description: string; prefill: { name: string; email: string; contact: string }; notes?: Record<string, string> }) => {
      orderRef.current = order.orderId;
      if (!(await loadRazorpay()) || !window.Razorpay) {
        setBusy(false);
        setMessage("The payment window couldn't load. Check your connection and try again.");
        return;
      }
      const checkout = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Mindvines",
        description: options.description,
        prefill: options.prefill,
        notes: options.notes ?? {},
        theme: { color: "#f0a500" },
        handler: async (response: RazorpaySuccess) => {
          setBusy(true);
          const verified = await postJson("/api/checkout/verify", response).catch(() => null);
          const status = verified?.data.status;
          if (status === "paid") finish("paid");
          else if (status === "pending" || !verified) finish("pending");
          else finish("failed", String(verified.data.error ?? "We couldn't confirm this payment."));
        },
        modal: {
          ondismiss: () => {
            void postJson("/api/checkout/outcome", { orderId: order.orderId, outcome: "cancelled" }).catch(() => null);
            setBusy(false);
            setOutcome((current) => current ?? "cancelled");
          },
        },
      });
      checkout.on("payment.failed", (response) => {
        const reason = response.error?.description ?? "The payment failed.";
        void postJson("/api/checkout/outcome", { orderId: order.orderId, outcome: "failed", reason }).catch(() => null);
        finish("failed", reason);
      });
      setOutcome(null);
      checkout.open();
    },
    [finish]
  );

  return { outcome, setOutcome, message, setMessage, busy, setBusy, open };
}
