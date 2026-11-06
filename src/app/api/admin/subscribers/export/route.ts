import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";
import { SUBSCRIPTION_STATE_LABELS } from "@/lib/subscription-status";
import { listSubscriptionsForExport, parseSubscriptionFilters } from "@/services/subscriber.service";

const iso = (value?: Date | null) => (value ? value.toISOString() : "");
const yesNo = (value?: boolean | null) => (value === undefined || value === null ? "" : value ? "Yes" : "No");

/**
 * The registrations matching the list page's filters, as a CSV (opens in
 * Excel). One row per registration; each topic category gets its own column.
 * Only for signed-in staff who may read subscribers.
 */
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(user.role, "read", "subscribers")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filters = parseSubscriptionFilters(Object.fromEntries(new URL(request.url).searchParams));
  const items = await listSubscriptionsForExport(filters);

  // Topic categories that appear in these registrations, in first-seen order.
  const categories: string[] = [];
  for (const item of items) {
    for (const selection of item.registrationId?.preferences?.selections ?? []) {
      if (!categories.includes(selection.categoryName)) categories.push(selection.categoryName);
    }
  }

  const csv = toCsv(
    [
      "Registration ID", "Child name", "Date of birth", "Child age", "School", "Nickname",
      "Parent name", "Email", "Mobile",
      "Country/Region", "Address", "City", "Postal code",
      "Programme", "Plan", "Age group", "Duration (months)",
      "Payment status", "Amount paid (INR)", "Razorpay order ID", "Razorpay payment ID", "Paid at",
      "Subscription status", "Start date", "Expiry date", "Days remaining", "Registered",
      "Terms accepted", "Terms accepted at", "Feature work online", "Feature work consent at", "WhatsApp news & offers", "WhatsApp consent at",
      ...categories.map((name) => `Topics: ${name}`),
    ],
    items.map((item) => {
      const record = item.registrationId;
      const snapshot = item.registration;
      const consents = record?.consents;
      const selections = record?.preferences?.selections ?? [];
      return [
        item.reference,
        snapshot?.childName,
        snapshot?.childDob,
        snapshot?.childAge,
        snapshot?.school,
        record?.preferences?.nickname ?? snapshot?.nickname,
        snapshot?.name,
        snapshot?.email,
        snapshot?.phone,
        snapshot?.address?.country,
        record?.address ? [record.address.line1, record.address.line2].filter(Boolean).join(", ") : snapshot?.address?.line,
        snapshot?.address?.city,
        snapshot?.address?.postalCode,
        item.planSnapshot?.programme,
        item.planSnapshot?.name,
        item.planSnapshot?.ageGroup,
        item.planSnapshot?.durationMonths,
        item.payment?.status,
        item.payment?.status === "PAID" ? (item.payment.amount / 100).toFixed(2) : "",
        item.payment?.razorpayOrderId,
        item.payment?.razorpayPaymentId,
        iso(item.payment?.paidAt),
        SUBSCRIPTION_STATE_LABELS[item.state],
        iso(item.startDate),
        iso(item.expiryDate),
        item.state === "PENDING_PAYMENT" || item.state === "CANCELLED" ? "" : item.daysRemaining,
        iso(item.createdAt),
        yesNo(consents?.terms?.given ?? snapshot?.consents?.terms),
        iso(consents?.terms?.at ?? snapshot?.consents?.termsAcceptedAt),
        yesNo(consents?.featureWork?.given ?? snapshot?.consents?.featureWork),
        iso(consents?.featureWork?.at),
        yesNo(consents?.whatsappUpdates?.given ?? snapshot?.consents?.whatsappUpdates),
        iso(consents?.whatsappUpdates?.at),
        ...categories.map((name) => selections.find((selection) => selection.categoryName === name)?.topics.map((topic) => topic.title).join("; ") ?? ""),
      ];
    })
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
