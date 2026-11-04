import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { expireLapsedSubscriptions } from "@/services/checkout.service";

/**
 * Daily housekeeping: saves EXPIRED on lapsed subscriptions so reports and
 * exports match. Whether a subscription is valid never depends on this
 * running; that is worked out from its expiry date each time it is read.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const authorised =
    Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!authorised) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expired = await expireLapsedSubscriptions();
  return NextResponse.json({ expired });
}
