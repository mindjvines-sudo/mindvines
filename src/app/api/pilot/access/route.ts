import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { findPilotPlanByCode } from "@/services/pilot.service";
import { pilotAccessRequestSchema } from "@/validations/pilot.schema";

/**
 * Opens a restricted pilot plan with its access code. Rate limited so codes
 * can't be guessed, and a wrong code gets the same answer whatever plans exist.
 */
export async function POST(request: Request) {
  const parsed = pilotAccessRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your access code." }, { status: 400 });
  if (!checkRateLimit(`pilot-code:ip:${clientIp(request.headers)}`, { limit: 10, windowMs: 10 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }
  const plan = await findPilotPlanByCode(parsed.data.code);
  if (!plan) return NextResponse.json({ error: "That access code isn't valid, or the offer has closed." }, { status: 404 });
  return NextResponse.json({ plan }, { headers: { "Cache-Control": "no-store" } });
}
