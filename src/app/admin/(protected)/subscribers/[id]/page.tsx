import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { formatPaise } from "@/lib/subscription-status";
import { getSubscriptionDetail } from "@/services/subscriber.service";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/admin/ui/table";
import { ChartIcon, PeopleIcon, StarIcon } from "@/components/admin/icons";
import {
  PaymentStatusBadge,
  SubscriptionStateBadge,
  formatAdminDate,
  formatAdminDateTime,
} from "@/components/admin/subscription-badges";
import { cancelSubscriptionAction } from "../actions";

export const metadata: Metadata = { title: "Subscriber" };

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-navy-900">{children || "—"}</dd>
    </div>
  );
}

export default async function SubscriberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "subscribers")) redirect("/admin/dashboard");
  const { id } = await params;
  const detail = await getSubscriptionDetail(id);
  if (!detail) notFound();

  const { subscription, subscriber, payments, others } = detail;
  const canCancel = can(user.role, "update", "subscribers") && (subscription.status === "ACTIVE" || subscription.status === "PENDING_PAYMENT");
  const registration = subscription.registration;
  const showDays = subscription.state !== "PENDING_PAYMENT" && subscription.state !== "CANCELLED";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/subscribers", label: "All subscribers" }}
        title={registration?.name ?? "Subscriber"}
        description={registration?.email}
        meta={<SubscriptionStateBadge state={subscription.state} />}
        actions={
          canCancel ? (
            <ConfirmAction
              action={cancelSubscriptionAction.bind(null, id)}
              title="Cancel this subscription?"
              description="It stops being active straight away. The payment record stays as it is. Money is not refunded from here; do that in the Razorpay dashboard."
              confirmLabel="Cancel subscription"
              trigger="Cancel subscription"
              size="md"
            />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader icon={PeopleIcon} title="Customer" />
          <dl className="divide-y divide-line px-5 pb-3">
            <Detail label="Name">{registration?.name}</Detail>
            <Detail label="Email">{registration?.email}</Detail>
            <Detail label="Phone">{registration?.phone}</Detail>
            <Detail label="Child">{[registration?.childName, registration?.childAge && `${registration.childAge} years`].filter(Boolean).join(", ")}</Detail>
            <Detail label="Registered">{subscriber ? formatAdminDateTime(subscriber.createdAt) : "Not yet: payment is not verified"}</Detail>
          </dl>
        </Card>

        <Card>
          <CardHeader icon={StarIcon} title="Subscription" />
          <dl className="divide-y divide-line px-5 pb-3">
            <Detail label="Plan">{subscription.planSnapshot?.name}</Detail>
            <Detail label="Age group">{subscription.planSnapshot ? `Ages ${subscription.planSnapshot.ageGroup}` : ""}</Detail>
            <Detail label="Duration">{subscription.planSnapshot ? `${subscription.planSnapshot.durationMonths} months` : ""}</Detail>
            <Detail label="Starts">{formatAdminDate(subscription.startDate)}</Detail>
            <Detail label="Expires">{formatAdminDateTime(subscription.expiryDate)}</Detail>
            <Detail label="Days remaining">{showDays ? String(subscription.daysRemaining) : ""}</Detail>
            <Detail label="Created">{formatAdminDateTime(subscription.createdAt)}</Detail>
            {subscription.status === "CANCELLED" && <Detail label="Cancelled">{`${formatAdminDateTime(subscription.cancelledAt)}${subscription.cancelReason ? `. ${subscription.cancelReason}` : ""}`}</Detail>}
          </dl>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader icon={ChartIcon} title="Payments" description="Every payment attempt for this subscription" />
        <Table minWidth={0}>
          <THead>
            <tr>
              <Th>Date</Th>
              <Th align="right">Amount</Th>
              <Th>Status</Th>
              <Th hideBelow="md">Verified</Th>
              <Th hideBelow="lg">Razorpay IDs</Th>
            </tr>
          </THead>
          <TBody>
            {payments.map((payment) => (
              <Tr key={payment._id.toString()}>
                <Td className="whitespace-nowrap tabular-nums">{formatAdminDateTime(payment.paidAt ?? payment.createdAt)}</Td>
                <Td align="right" className="whitespace-nowrap tabular-nums">
                  {formatPaise(payment.amount)}
                  <span className="block text-xs text-slate-400">
                    {formatPaise(payment.baseAmount)} + {formatPaise(payment.taxAmount)} GST
                  </span>
                </Td>
                <Td>
                  <PaymentStatusBadge status={payment.status} />
                  {payment.failureReason && <span className="mt-1 block max-w-[240px] text-xs text-red-600">{payment.failureReason}</span>}
                </Td>
                <Td hideBelow="md" className="text-xs text-slate-600">
                  {payment.verification?.signatureVerified
                    ? `Signature OK via ${payment.verification.verifiedVia === "WEBHOOK" ? "webhook" : "checkout"}`
                    : "—"}
                  {payment.method && <span className="block text-slate-400">{payment.method}</span>}
                </Td>
                <Td hideBelow="lg" className="font-mono text-xs text-slate-500">
                  <span className="block">{payment.razorpayOrderId}</span>
                  <span className="block">{payment.razorpayPaymentId ?? "—"}</span>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>

      {others.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader icon={StarIcon} title="Subscription history" description="Other subscriptions for this customer" />
          <Table minWidth={0}>
            <THead>
              <tr>
                <Th>Plan</Th>
                <Th hideBelow="sm">Starts</Th>
                <Th hideBelow="sm">Expires</Th>
                <Th>Status</Th>
              </tr>
            </THead>
            <TBody>
              {others.map((item) => (
                <Tr key={item._id.toString()}>
                  <Td>
                    <Link href={`/admin/subscribers/${item._id}`} className="font-medium text-navy-900 hover:text-primary-700">
                      {item.planSnapshot?.name}
                    </Link>
                  </Td>
                  <Td hideBelow="sm" className="whitespace-nowrap tabular-nums">{formatAdminDate(item.startDate)}</Td>
                  <Td hideBelow="sm" className="whitespace-nowrap tabular-nums">{formatAdminDate(item.expiryDate)}</Td>
                  <Td>
                    <SubscriptionStateBadge state={item.state} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
