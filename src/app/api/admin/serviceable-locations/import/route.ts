import { NextResponse } from "next/server";
import { badRequest, readJson, requireAccess } from "@/lib/admin-api";
import { locationErrorResponse } from "@/lib/locations/api-errors";
import { MAX_IMPORT_ROWS, parseImportCsv } from "@/lib/locations/pincode";
import { importLocations } from "@/services/location.service";
import { logAction } from "@/services/audit.service";
import { importSchema } from "@/validations/location.schema";

export const maxDuration = 60;

/**
 * Super Admin: bulk add from CSV text ({ csv }). Rows are checked one by one;
 * duplicates and invalid pincodes are reported back, the rest are added.
 */
export async function POST(request: Request) {
  const access = await requireAccess("create", "locations");
  if ("error" in access) return access.error;
  const body = importSchema.safeParse(await readJson(request));
  if (!body.success) return badRequest("Choose a CSV file under 200 KB.");

  const parsed = parseImportCsv(body.data.csv);
  if (parsed.tooMany) return badRequest(`Import up to ${MAX_IMPORT_ROWS} pincodes at a time.`);
  if (parsed.rows.length === 0 && parsed.issues.length === 0) return badRequest("The file has no pincodes.");

  try {
    const result = await importLocations(parsed.rows, access.user.id);
    await logAction({
      userId: access.user.id,
      action: "CREATE",
      entity: "ServiceableLocation",
      metadata: { import: true, created: result.created.length, skipped: result.skipped.length, failed: result.failed.length + parsed.issues.length },
    });
    return NextResponse.json({ created: result.created.length, skipped: result.skipped, failed: [...parsed.issues, ...result.failed].sort((a, b) => a.line - b.line) });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
