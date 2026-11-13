import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalisePincode } from "@/lib/locations/pincode";
import { NotServiceableError, verifyServiceable } from "@/services/location.service";

/**
 * Public: is this pincode one we register from, and what are its state,
 * district, city and post offices. Only that. Reads the saved list, never the
 * postal provider. "Not in the list" and "switched off" look the same.
 */
export async function GET(request: Request, { params }: { params: Promise<{ pincode: string }> }) {
  if (!checkRateLimit(`pincode:ip:${clientIp(request.headers)}`, { limit: 60, windowMs: 10 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: "Too many lookups. Please try again in a few minutes." }, { status: 429 });
  }
  const { pincode } = await params;
  if (!normalisePincode(pincode)) return NextResponse.json({ serviceable: false, error: "Enter a valid 6-digit PIN code." }, { status: 400 });

  try {
    const location = await verifyServiceable({ countryCode: "IN", pincode });
    return NextResponse.json(
      { serviceable: true, pincode: location.pincode, country: "India", state: location.stateName, district: location.districtName, city: location.cityName, postOffices: location.postOffices },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof NotServiceableError) return NextResponse.json({ serviceable: false, error: error.message });
    console.error("Pincode lookup failed", error);
    return NextResponse.json({ error: "We couldn't check this pincode. Please try again." }, { status: 500 });
  }
}
