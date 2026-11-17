import { NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordUnservedSearch } from "@/services/area-interest.service";
import { NotServiceableError, verifyServiceable } from "@/services/location.service";
import { validateLocationSchema } from "@/validations/location.schema";

/** Public: the registration form's location check (country + pincode). The same rule is enforced again when details are saved and when payment starts. */
export async function POST(request: Request) {
  if (!checkRateLimit(`pincode:ip:${clientIp(request.headers)}`, { limit: 60, windowMs: 10 * 60 * 1000 }).allowed) {
    return NextResponse.json({ error: "Too many lookups. Please try again in a few minutes." }, { status: 429 });
  }
  const body = validateLocationSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ serviceable: false, error: "Enter a valid 6-digit PIN code." }, { status: 400 });

  try {
    const location = await verifyServiceable({ countryCode: body.data.countryCode, pincode: body.data.pincode });
    return NextResponse.json(
      { serviceable: true, pincode: location.pincode, country: "India", state: location.stateName, district: location.districtName, city: location.cityName, postOffices: location.postOffices },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof NotServiceableError) {
      if (error.reason !== "INVALID_PINCODE" && error.reason !== "INVALID_COUNTRY") await recordUnservedSearch(body.data.pincode.replace(/\s+/g, "")).catch((e) => console.error("Could not record pincode search", e));
      return NextResponse.json({ serviceable: false, error: error.message }, { status: error.reason === "INVALID_PINCODE" ? 400 : 200 });
    }
    console.error("Location validation failed", error);
    return NextResponse.json({ error: "We couldn't check this pincode. Please try again." }, { status: 500 });
  }
}
