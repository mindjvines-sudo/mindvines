import { NextResponse } from "next/server";
import { badRequest, readJson, requireAccess } from "@/lib/admin-api";
import { locationErrorResponse } from "@/lib/locations/api-errors";
import { setLocationStatus } from "@/services/location.service";
import { logAction } from "@/services/audit.service";
import { statusSchema } from "@/validations/location.schema";

/** Switch registrations from a pincode on or off. Children already registered are never affected. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess("update", "locations");
  if ("error" in access) return access.error;
  const parsed = statusSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();
  const { id } = await params;
  try {
    const updated = await setLocationStatus(id, parsed.data.isServiceable, access.user.id);
    await logAction({
      userId: access.user.id,
      action: "UPDATE",
      entity: "ServiceableLocation",
      entityId: id,
      metadata: { pincode: updated.pincode, isServiceable: updated.isServiceable, change: updated.isServiceable ? "activated" : "deactivated" },
    });
    return NextResponse.json({ id, isServiceable: updated.isServiceable });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
