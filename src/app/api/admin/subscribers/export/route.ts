import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { SUBSCRIPTION_STATE_LABELS } from "@/lib/subscription-status";
import { listSubscriptionsForExport, parseSubscriptionFilters } from "@/services/subscriber.service";

const iso = (value?: Date | null) => (value ? value.toISOString() : "");

/** The subscriptions matching the list page's filters, as a CSV. Only for signed-in staff who may read subscribers. */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "read", "subscribers")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filters = parseSubscriptionFilters(Object.fromEntries(new URL(request.url).searchParams));
  const items = await listSubscriptionsForExport(filters);

  const csv = toCsv(
    ["Name", "Email", "Phone", "Child name", "Child age", "Plan", "Age group", "Duration (months)", "Start date", "Expiry date", "Days remaining", "Subscription status", "Amount paid (INR)", "Payment status", "Razorpay payment ID", "Registered"],
    items.map((item) => [
      item.registration?.name,
      item.registration?.email,
      item.registration?.phone,
      item.registration?.childName,
      item.registration?.childAge,
      item.planSnapshot?.name,
      item.planSnapshot?.ageGroup,
      item.planSnapshot?.durationMonths,
      iso(item.startDate),
      iso(item.expiryDate),
      item.state === "PENDING_PAYMENT" || item.state === "CANCELLED" ? "" : item.daysRemaining,
      SUBSCRIPTION_STATE_LABELS[item.state],
      item.payment ? (item.payment.amount / 100).toFixed(2) : "",
      item.payment?.status,
      item.payment?.razorpayPaymentId,
      iso(item.createdAt),
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
