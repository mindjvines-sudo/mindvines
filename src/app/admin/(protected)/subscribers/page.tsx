import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PAYMENT_STATUSES, SUBSCRIPTION_STATES, SUBSCRIPTION_STATE_LABELS, formatPaise } from "@/lib/subscription-status";
import {
  countSubscriptionsByState,
  listPlanOptions,
  listSubscriptionsAdmin,
  parseSubscriptionFilters,
} from "@/services/subscriber.service";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { EmptyState } from "@/components/admin/ui/feedback";
import { FilterTabs, Pagination, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import { inputClasses } from "@/components/admin/ui/form";
import { ChevronRightIcon, InboxIcon, SearchIcon } from "@/components/admin/icons";
import {
  PAYMENT_STATUS_LABELS,
  PaymentStatusBadge,
  SubscriptionStateBadge,
  formatAdminDate,
} from "@/components/admin/subscription-badges";

export const metadata: Metadata = { title: "Subscribers" };

type SearchParams = Record<string, string | undefined>;

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "subscribers")) redirect("/admin/dashboard");

  const params = await searchParams;
  const filters = parseSubscriptionFilters(params);
  const [result, counts, plans] = await Promise.all([
    listSubscriptionsAdmin({ ...filters, page: params.page }),
    countSubscriptionsByState(filters),
    listPlanOptions(),
  ]);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Every active filter, as it would appear in a link.
  const active: SearchParams = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  const filtered = Object.keys(active).length > 0;
  const tabParams = { ...active, state: undefined };
  const exportHref = hrefWith("/api/admin/subscribers/export", active);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Subscribers"
        description="Everyone who has paid for a plan, with their subscription dates and payments. Plans needing renewal are flagged."
        actions={
          can(user.role, "read", "subscribers") ? (
            <a href={exportHref} className={buttonClasses({ variant: "secondary" })}>
              Export CSV
            </a>
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <FilterTabs
            label="Filter by subscription status"
            tabs={[
              { label: "All", href: hrefWith("/admin/subscribers", tabParams), active: !filters.state, count: total },
              ...SUBSCRIPTION_STATES.map((state) => ({
                label: SUBSCRIPTION_STATE_LABELS[state],
                href: hrefWith("/admin/subscribers", { ...tabParams, state }),
                active: filters.state === state,
                count: counts[state],
              })),
            ]}
          />

          <form method="get" role="search" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {filters.state && <input type="hidden" name="state" value={filters.state} />}
            <label className="relative flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
              Search
              <SearchIcon className="pointer-events-none absolute bottom-[11px] left-3 size-4 text-slate-400" />
              <input type="search" name="search" defaultValue={filters.search} placeholder="Name, email or phone" className={inputClasses(false, "h-10 pl-9")} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Plan
              <select name="plan" defaultValue={filters.plan ?? ""} className={inputClasses(false, "h-10")}>
                <option value="">All plans</option>
                {plans.map((plan) => (
                  <option key={plan._id.toString()} value={plan._id.toString()}>
                    {plan.name} (ages {plan.ageGroup}, {plan.durationMonths} mo)
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Payment
              <select name="payment" defaultValue={filters.payment ?? ""} className={inputClasses(false, "h-10")}>
                <option value="">Any payment status</option>
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PAYMENT_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            {(
              [
                ["startFrom", "Starts from"],
                ["startTo", "Starts until"],
                ["expiryFrom", "Expires from"],
                ["expiryTo", "Expires until"],
              ] as const
            ).map(([name, label]) => (
              <label key={name} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                {label}
                <input type="date" name={name} defaultValue={filters[name]} className={inputClasses(false, "h-10")} />
              </label>
            ))}
            <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-4">
              <button type="submit" className={buttonClasses({ variant: "primary" })}>
                Apply filters
              </button>
              {filtered && (
                <ButtonLink href="/admin/subscribers" variant="secondary">
                  Clear filters
                </ButtonLink>
              )}
            </div>
          </form>
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title={filtered ? "No matching subscribers" : "No subscribers yet"}
            description={filtered ? "Try a different search or filter." : "People appear here once their payment has been verified."}
            className="border-t border-line"
          />
        ) : (
          <Table minWidth={0}>
            <THead>
              <tr>
                <Th>Customer</Th>
                <Th hideBelow="md">Plan</Th>
                <Th hideBelow="lg">Starts</Th>
                <Th hideBelow="lg">Expires</Th>
                <Th hideBelow="lg" align="right">Days left</Th>
                <Th hideBelow="sm" align="right">Paid</Th>
                <Th hideBelow="lg">Payment</Th>
                <Th>Status</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item) => (
                <Tr key={item._id.toString()}>
                  <Td>
                    <Link href={`/admin/subscribers/${item._id}`} className="group block min-w-0">
                      <span className="block truncate font-medium text-navy-900 group-hover:text-primary-700">{item.registration?.name}</span>
                      <span className="block truncate text-xs text-slate-500">{item.registration?.email}</span>
                      <span className="block truncate text-xs text-slate-400">{item.registration?.phone}</span>
                    </Link>
                  </Td>
                  <Td hideBelow="md">
                    <span className="block max-w-[200px] truncate text-slate-700">{item.planSnapshot?.name}</span>
                    <span className="block text-xs text-slate-400">
                      Ages {item.planSnapshot?.ageGroup} · {item.planSnapshot?.durationMonths} mo
                    </span>
                  </Td>
                  <Td hideBelow="lg" className="whitespace-nowrap tabular-nums">{formatAdminDate(item.startDate)}</Td>
                  <Td hideBelow="lg" className="whitespace-nowrap tabular-nums">{formatAdminDate(item.expiryDate)}</Td>
                  <Td hideBelow="lg" align="right" className="tabular-nums">
                    {item.state === "PENDING_PAYMENT" || item.state === "CANCELLED" ? "—" : item.daysRemaining}
                  </Td>
                  <Td hideBelow="sm" align="right" className="whitespace-nowrap tabular-nums">
                    {item.payment ? formatPaise(item.payment.amount) : "—"}
                  </Td>
                  <Td hideBelow="lg">{item.payment ? <PaymentStatusBadge status={item.payment.status} /> : "—"}</Td>
                  <Td>
                    <SubscriptionStateBadge state={item.state} />
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <ButtonLink href={`/admin/subscribers/${item._id}`} variant="ghost" size="sm" aria-label={`Open ${item.registration?.name}`}>
                        Open
                        <ChevronRightIcon />
                      </ButtonLink>
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}

        <Pagination
          path="/admin/subscribers"
          page={result.page}
          pages={result.pages}
          total={result.total}
          limit={result.limit}
          params={active}
          noun="subscriptions"
        />
      </Card>
    </div>
  );
}
