import { NextResponse } from "next/server";
import { listPublicPilotPlans } from "@/services/pilot.service";

/** The pilot plans anyone may see: active, public, inside their window. Restricted and inactive plans are never listed. */
export async function GET() {
  const plans = await listPublicPilotPlans();
  return NextResponse.json({ plans }, { headers: { "Cache-Control": "no-store" } });
}
