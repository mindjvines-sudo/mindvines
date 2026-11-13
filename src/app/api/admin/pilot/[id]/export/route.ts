import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { PILOT_RESERVATION_LABELS } from "@/lib/pilot";
import { listPilotRegistrations } from "@/services/pilot.service";

const iso = (value?: Date | null) => (value ? value.toISOString() : "");

/** One pilot plan's registrations as a CSV, for signed-in staff who may read pilot plans. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "read", "pilotPlans")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const url = new URL(request.url);
  const result = await listPilotRegistrations(id, { status: url.searchParams.get("status") ?? undefined, search: url.searchParams.get("search") ?? undefined }, { all: true });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const csv = toCsv(
    ["Registration ID", "Subscription type", "Pilot plan", "Child name", "Parent name", "Email", "Mobile", "Status", "Registered", "Subscription start", "Subscription expiry", "Payment status", "Amount paid (INR)", "Payment reference"],
    result.items.map((row) => [
      row.subscriptionDoc?.reference,
      "Pilot Subscription",
      row.planName,
      row.subscriptionDoc?.registration?.childName,
      row.subscriptionDoc?.registration?.name,
      row.email,
      row.subscriptionDoc?.registration?.phone,
      PILOT_RESERVATION_LABELS[row.status],
      iso(row.registrationDate),
      iso(row.subscriptionStartDate),
      iso(row.subscriptionExpiryDate),
      row.paymentStatus,
      row.paymentStatus === "PAID" ? (row.amount / 100).toFixed(2) : "",
      row.paymentReference,
    ])
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pilot-registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
