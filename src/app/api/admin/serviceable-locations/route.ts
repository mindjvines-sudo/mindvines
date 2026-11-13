import { NextResponse } from "next/server";
import { badRequest, readJson, requireAccess } from "@/lib/admin-api";
import { locationErrorResponse } from "@/lib/locations/api-errors";
import { LocationError, createLocation, listLocations, lookupPincodeForAdmin, parseLocationFilters } from "@/services/location.service";
import { logAction } from "@/services/audit.service";
import { createLocationSchema } from "@/validations/location.schema";

/** Super Admin: the serviceable pincodes, filtered and paged (?search, state, district, status, page). */
export async function GET(request: Request) {
  const access = await requireAccess("read", "locations");
  if ("error" in access) return access.error;
  const filters = parseLocationFilters(Object.fromEntries(new URL(request.url).searchParams));
  const result = await listLocations(filters);
  return NextResponse.json({ ...result, items: result.items.map(({ _id, ...item }) => ({ id: _id.toString(), ...item })) });
}

/** Super Admin: adds a pincode. Anything left out (state, district, city, post offices) is looked up from India Post. */
export async function POST(request: Request) {
  const access = await requireAccess("create", "locations");
  if ("error" in access) return access.error;

  const parsed = createLocationSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Please check the details.", parsed.error.flatten().fieldErrors);
  const input = parsed.data;

  try {
    let { stateName, districtName, cityName, postOffices } = input;
    if (!stateName || !districtName || !cityName || !postOffices) {
      const found = await lookupPincodeForAdmin(input.pincode);
      if (found.existing) throw new LocationError("DUPLICATE", `Pincode ${input.pincode} is already in the list.`);
      stateName ??= found.info!.stateName;
      districtName ??= found.info!.districtName;
      cityName ??= found.info!.cityName;
      postOffices ??= found.info!.postOffices;
    }
    const created = await createLocation(
      { pincode: input.pincode, stateName, districtName, cityName, postOffices, isServiceable: input.isServiceable, remarks: input.remarks },
      access.user.id
    );
    await logAction({ userId: access.user.id, action: "CREATE", entity: "ServiceableLocation", entityId: created._id.toString(), metadata: { pincode: created.pincode, isServiceable: created.isServiceable } });
    return NextResponse.json({ id: created._id.toString(), pincode: created.pincode }, { status: 201 });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
