import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalisePincode } from "@/lib/locations/pincode";
import { recordUnservedSearch } from "@/services/area-interest.service";
import { NotServiceableError, verifyServiceable } from "@/services/location.service";

/** Public: "is Mindvines available at my pincode?". Searches for areas we don't serve are stored for the admin. */
export async function POST(request: Request) {
  if (!checkRateLimit(`availability:ip:${clientIp(request.headers)}`, { limit: 30, windowMs: 10 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: "Too many searches. Please try again in a few minutes." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { pincode?: unknown } | null;
  const pincode = normalisePincode(body?.pincode);
  if (!pincode) return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });

  try {
    const location = await verifyServiceable({ countryCode: "IN", pincode });
    return NextResponse.json({ serviceable: true, pincode, city: location.cityName, state: location.stateName }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof NotServiceableError) {
      await recordUnservedSearch(pincode).catch((e) => console.error("Could not record pincode search", e));
      return NextResponse.json({ serviceable: false, pincode }, { headers: { "Cache-Control": "no-store" } });
    }
    console.error("Availability check failed", error);
    return NextResponse.json({ error: "We couldn't check this pincode. Please try again." }, { status: 500 });
  }
}
