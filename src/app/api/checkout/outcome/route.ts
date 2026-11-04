import { NextResponse } from "next/server";
import { recordPaymentOutcome } from "@/services/checkout.service";
import { checkoutOutcomeSchema } from "@/validations/checkout.schema";

/** Records a failed or dismissed attempt. It can never change a paid payment, and activates nothing. */
export async function POST(request: Request) {
  const parsed = checkoutOutcomeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await recordPaymentOutcome(parsed.data.orderId, parsed.data.outcome, parsed.data.reason);
  return NextResponse.json({ ok: true });
}
