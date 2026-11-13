import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/admin-api";
import { locationErrorResponse } from "@/lib/locations/api-errors";
import { lookupPincodeForAdmin } from "@/services/location.service";

/** Super Admin: what India Post says about a pincode, for the Add form to fill in. Nothing is saved. */
export async function GET(_request: Request, { params }: { params: Promise<{ pincode: string }> }) {
  const access = await requireAccess("create", "locations");
  if ("error" in access) return access.error;
  try {
    return NextResponse.json(await lookupPincodeForAdmin((await params).pincode));
  } catch (error) {
    return locationErrorResponse(error);
  }
}
