import { NextResponse } from "next/server";
import { badRequest, readJson, requireAccess } from "@/lib/admin-api";
import { locationErrorResponse } from "@/lib/locations/api-errors";
import { deleteLocation, getLocation, updateLocation } from "@/services/location.service";
import { logAction } from "@/services/audit.service";
import { updateLocationSchema } from "@/validations/location.schema";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const access = await requireAccess("read", "locations");
  if ("error" in access) return access.error;
  const location = await getLocation((await params).id);
  if (!location) return NextResponse.json({ error: "Location not found." }, { status: 404 });
  const { _id, ...rest } = location;
  return NextResponse.json({ id: _id.toString(), ...rest });
}

export async function PATCH(request: Request, { params }: Context) {
  const access = await requireAccess("update", "locations");
  if ("error" in access) return access.error;
  const parsed = updateLocationSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest("Please check the details.", parsed.error.flatten().fieldErrors);
  const { id } = await params;
  try {
    const updated = await updateLocation(id, parsed.data, access.user.id);
    await logAction({ userId: access.user.id, action: "UPDATE", entity: "ServiceableLocation", entityId: id, metadata: { pincode: updated.pincode, isServiceable: updated.isServiceable } });
    return NextResponse.json({ id, pincode: updated.pincode });
  } catch (error) {
    return locationErrorResponse(error);
  }
}

/** Only a pincode nobody has registered from can be deleted; otherwise deactivate it. */
export async function DELETE(_request: Request, { params }: Context) {
  const access = await requireAccess("delete", "locations");
  if ("error" in access) return access.error;
  const { id } = await params;
  try {
    const deleted = await deleteLocation(id);
    await logAction({ userId: access.user.id, action: "DELETE", entity: "ServiceableLocation", entityId: id, metadata: { pincode: deleted.pincode } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
