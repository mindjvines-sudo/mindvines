import { NextResponse } from "next/server";
import { getPaymentStatus } from "@/services/checkout.service";

/** For the page to poll while a payment is still being confirmed. Reveals the status and nothing else. */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("order") ?? "";
  if (!/^order_[A-Za-z0-9]{6,40}$/.test(orderId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const status = await getPaymentStatus(orderId);
  if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ status }, { headers: { "Cache-Control": "no-store" } });
}
