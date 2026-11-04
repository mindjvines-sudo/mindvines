import { getSubscriptionStats } from "@/services/subscriber.service";
import { formatPaise } from "@/lib/subscription-status";
import { StatTile } from "@/components/admin/stat-tile";
import { BarList, DonutChart } from "@/components/admin/charts";
import { Card, CardHeader, CardLink } from "@/components/admin/ui/card";
import { EmptyState } from "@/components/admin/ui/feedback";
import { AlertIcon, CheckCircleIcon, ChartIcon, ClockIcon, PeopleIcon, StarIcon } from "@/components/admin/icons";
import { PaymentStatusBadge, formatAdminDate } from "@/components/admin/subscription-badges";

/** What the donut's segments mean, in the same colours the status badges use. */
const STATE_SEGMENTS = [
  { key: "ACTIVE", label: "Active", color: "#10b981" },
  { key: "EXPIRING_SOON", label: "Expiring soon", color: "#f59e0b" },
  { key: "EXPIRING_TODAY", label: "Expiring today", color: "#ef4444" },
  { key: "EXPIRED", label: "Expired", color: "#94a3b8" },
  { key: "PENDING_PAYMENT", label: "Pending payment", color: "#0ea5e9" },
  { key: "CANCELLED", label: "Cancelled", color: "#cbd5e1" },
] as const;

export async function SubscriptionAnalytics() {
  const stats = await getSubscriptionStats();

  return (
    <section aria-labelledby="subscription-analytics" className="flex flex-col gap-6">
      <h2 id="subscription-analytics" className="text-lg font-semibold text-navy-900">
        Subscriptions
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile icon={PeopleIcon} color="blue" label="Registered users" value={stats.totalUsers} href="/admin/subscribers" note="Paid and verified" />
        <StatTile icon={CheckCircleIcon} color="green" label="Active subscriptions" value={stats.active} href="/admin/subscribers?state=ACTIVE" note="Currently valid" />
        <StatTile icon={ClockIcon} color="amber" label="Expiring in 7 days" value={stats.expiringWithin7Days} href="/admin/subscribers?state=EXPIRING_SOON" note={`${stats.states.EXPIRING_TODAY} expire today`} />
        <StatTile icon={StarIcon} color="slate" label="Expired" value={stats.states.EXPIRED} href="/admin/subscribers?state=EXPIRED" note="Ready to renew" />
        <StatTile icon={AlertIcon} color="violet" label="Pending payments" value={stats.states.PENDING_PAYMENT} href="/admin/subscribers?state=PENDING_PAYMENT" note={`${stats.failedPayments} failed attempts`} />
        <StatTile icon={ChartIcon} color="teal" label="Successful payments" value={stats.successfulPayments} note={`${formatPaise(stats.revenue)} received`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader icon={ChartIcon} title="Subscription status" description="Every subscription by where it stands today" />
          <div className="p-5">
            <DonutChart
              totalLabel="Subscriptions"
              emptyLabel="No subscriptions yet"
              segments={STATE_SEGMENTS.map((segment) => ({ label: segment.label, color: segment.color, value: stats.states[segment.key] }))}
            />
          </div>
        </Card>

        <Card>
          <CardHeader icon={StarIcon} title="Users by plan" description="Active subscriptions for each plan" />
          <div className="p-5">
            {stats.distribution.length === 0 ? (
              <p className="text-sm text-slate-500">No active subscriptions yet.</p>
            ) : (
              <BarList items={stats.distribution} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={PeopleIcon}
            title="Recent registrations"
            action={<CardLink href="/admin/subscribers">View all</CardLink>}
          />
          {stats.recentRegistrations.length === 0 ? (
            <EmptyState icon={PeopleIcon} title="No registrations yet" description="New subscribers appear here after their payment is verified." />
          ) : (
            <ul className="divide-y divide-line px-5 pb-2">
              {stats.recentRegistrations.map((person) => (
                <li key={person._id.toString()} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy-900">{person.name}</span>
                    <span className="block truncate text-xs text-slate-500">{person.email}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">{formatAdminDate(person.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader icon={ChartIcon} title="Recent payments" description="The latest payment attempts, paid or not" />
        {stats.recentPayments.length === 0 ? (
          <EmptyState icon={ChartIcon} title="No payments yet" description="Payment attempts will appear here." />
        ) : (
          <ul className="divide-y divide-line px-5 pb-2">
            {stats.recentPayments.map((payment) => (
              <li key={payment._id.toString()} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-navy-900">{payment.subscription?.registration?.name ?? "Customer"}</span>
                  <span className="block truncate text-xs text-slate-500">{payment.subscription?.planSnapshot?.name}</span>
                </span>
                <span className="flex items-center gap-4">
                  <span className="tabular-nums text-navy-900">{formatPaise(payment.amount)}</span>
                  <PaymentStatusBadge status={payment.status} />
                  <span className="hidden w-24 text-right text-xs tabular-nums text-slate-400 sm:block">{formatAdminDate(payment.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
