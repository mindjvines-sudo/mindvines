import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/admin-api";
import { toCsv } from "@/lib/csv";
import { listLocationsForExport, parseLocationFilters } from "@/services/location.service";

/** Super Admin: the list (with the page's filters) as a CSV. */
export async function GET(request: Request) {
  const access = await requireAccess("read", "locations");
  if ("error" in access) return access.error;
  const items = await listLocationsForExport(parseLocationFilters(Object.fromEntries(new URL(request.url).searchParams)));
  const csv = toCsv(
    ["Pincode", "City / Town", "District", "State", "Country", "Post offices", "Registered children", "Status", "Remarks", "Created"],
    items.map((item) => [
      item.pincode, item.cityName, item.districtName, item.stateName, item.countryName,
      item.postOffices.map((office) => office.name).join("; "), item.registered,
      item.isServiceable ? "Active" : "Inactive", item.remarks, item.createdAt.toISOString(),
    ])
  );
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="serviceable-locations.csv"', "Cache-Control": "no-store" },
  });
}
