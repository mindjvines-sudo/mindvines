import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PAYMENT_STATUSES, SUBSCRIPTION_STATES, SUBSCRIPTION_STATE_LABELS, type SubscriptionState } from "@/lib/subscription-status";
import {
  SORTS,
  countSubscriptionsByState,
  listPlanOptions,
  listRegistrationFilterOptions,
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
import { SendReminderButton } from "@/components/admin/send-reminder-button";
import { sendRenewalReminderAction } from "./actions";
import { ChevronRightIcon, InboxIcon, SearchIcon } from "@/components/admin/icons";
import {
  PAYMENT_STATUS_LABELS,
  PaymentStatusBadge,
  SubscriptionStateBadge,
  formatAdminDate,
} from "@/components/admin/subscription-badges";

export const metadata: Metadata = { title: "Registrations" };

type SearchParams = Record<string, string | undefined>;

/** Titles matching the sidebar's Subscription Management entries. */
const TITLES: Partial<Record<SubscriptionState, string>> = {
  ACTIVE: "Active Subscriptions",
  UPCOMING: "Upcoming (queued) Subscriptions",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRING_TODAY: "Expiring Today",
  EXPIRED: "Expired Subscriptions",
  PENDING_PAYMENT: "Pending Payments",
  CANCELLED: "Cancelled Subscriptions",
};

const label = "flex flex-col gap-1 text-xs font-medium text-slate-600";

export default async function RegistrationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "subscribers")) redirect("/admin/dashboard");
  const canRemind = can(user.role, "update", "subscribers");

  const params = await searchParams;
  const filters = parseSubscriptionFilters(params);
  const [result, counts, plans, options] = await Promise.all([
    listSubscriptionsAdmin({ ...filters, page: params.page }),
    countSubscriptionsByState(filters),
    listPlanOptions(),
    listRegistrationFilterOptions(),
  ]);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  // Every active filter, as it would appear in a link.
  const active: SearchParams = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  const filtered = Object.keys(active).some((key) => key !== "sort");
  const tabParams = { ...active, state: undefined };
  const exportHref = hrefWith("/api/admin/subscribers/export", active);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={(filters.state && TITLES[filters.state]) || "All Registrations"}
        description="Every child registration with its parent, programme, plan, payment and subscription dates. Filter, search and export the list."
        actions={
          <a href={exportHref} className={buttonClasses({ variant: "secondary" })}>
            Export CSV
          </a>
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
            <label className={`relative ${label} sm:col-span-2`}>
              Search
              <SearchIcon className="pointer-events-none absolute bottom-[11px] left-3 size-4 text-slate-400" />
              <input type="search" name="search" defaultValue={filters.search} placeholder="Child, parent, email, mobile or MV- reference" className={inputClasses(false, "h-10 pl-9")} />
            </label>
            <label className={label}>
              Programme
              <select name="programme" defaultValue={filters.programme ?? ""} className={inputClasses(false, "h-10")}>
                <option value="">All programmes</option>
                {options.programmes.map((programme) => <option key={programme} value={programme}>{programme}</option>)}
              </select>
            </label>
            <label className={label}>
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
            <label className={label}>
              Payment
              <select name="payment" defaultValue={filters.payment ?? ""} className={inputClasses(false, "h-10")}>
                <option value="">Any payment status</option>
                {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{PAYMENT_STATUS_LABELS[status]}</option>)}
              </select>
            </label>
            <label className={label}>
              School
              <input type="search" name="school" defaultValue={filters.school} placeholder="School name contains…" className={inputClasses(false, "h-10")} />
            </label>
            <label className={label}>
              Country/Region
              <select name="country" defaultValue={filters.country ?? ""} className={inputClasses(false, "h-10")}>
                <option value="">All countries</option>
                {options.countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
              </select>
            </label>
            <label className={label}>
              Sort by
              <select name="sort" defaultValue={filters.sort ?? "newest"} className={inputClasses(false, "h-10")}>
                {Object.entries(SORTS).map(([value, sort]) => <option key={value} value={value}>{sort.label}</option>)}
              </select>
            </label>
            {(
              [
                ["registeredFrom", "Registered from"],
                ["registeredTo", "Registered until"],
                ["expiryFrom", "Expires from"],
                ["expiryTo", "Expires until"],
              ] as const
            ).map(([name, text]) => (
              <label key={name} className={label}>
                {text}
                <input type="date" name={name} defaultValue={filters[name]} className={inputClasses(false, "h-10")} />
              </label>
            ))}
            <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-4">
              <button type="submit" className={buttonClasses({ variant: "primary" })}>Apply filters</button>
              {(filtered || filters.sort) && <ButtonLink href={hrefWith("/admin/subscribers", { state: filters.state })} variant="secondary">Clear filters</ButtonLink>}
            </div>
          </form>
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title={filtered ? "No matching registrations" : "No registrations yet"}
            description={filtered ? "Try a different search or filter." : "Registrations appear here once a parent starts paying for a plan."}
            className="border-t border-line"
          />
        ) : (
          <Table minWidth={1240}>
            <THead>
              <tr>
                <Th>Registration</Th>
                <Th>Child</Th>
                <Th>Parent</Th>
                <Th>Programme / plan</Th>
                <Th>Payment</Th>
                <Th>Subscription</Th>
                <Th>Starts</Th>
                <Th>Expires</Th>
                <Th>Registered</Th>
                <Th>Renewal</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item) => {
                const href = `/admin/subscribers/${item._id}`;
                return (
                  <Tr key={item._id.toString()}>
                    <Td className="whitespace-nowrap font-mono text-xs">
                      <Link href={href} className="font-medium text-navy-900 hover:text-primary-700">{item.reference ?? "—"}</Link>
                      {item.renewal && <span className="mt-1 block font-sans text-[11px] font-semibold uppercase tracking-wide text-violet-700">Renewal</span>}
                    </Td>
                    <Td>
                      <Link href={href} className="group block min-w-0">
                        <span className="block max-w-[180px] truncate font-medium text-navy-900 group-hover:text-primary-700">{item.registration?.childName || "—"}</span>
                        <span className="block max-w-[180px] truncate text-xs text-slate-500">{item.registration?.school}</span>
                      </Link>
                    </Td>
                    <Td>
                      <span className="block max-w-[200px] truncate text-slate-800">{item.registration?.name}</span>
                      <span className="block max-w-[200px] truncate text-xs text-slate-500">{item.registration?.email}</span>
                      <span className="block truncate text-xs text-slate-400">{item.registration?.phone}</span>
                    </Td>
                    <Td>
                      <span className="block max-w-[200px] truncate text-slate-700">{item.planSnapshot?.programme ?? item.planSnapshot?.name}</span>
                      <span className="block text-xs text-slate-400">
                        {item.planSnapshot?.name} · Ages {item.planSnapshot?.ageGroup} · {item.planSnapshot?.durationMonths} mo
                      </span>
                    </Td>
                    <Td>{item.payment ? <PaymentStatusBadge status={item.payment.status} /> : "—"}</Td>
                    <Td>
                      <SubscriptionStateBadge state={item.state} />
                      {item.state !== "PENDING_PAYMENT" && item.state !== "CANCELLED" && item.expiryDate && (
                        <span className="mt-1 block text-xs tabular-nums text-slate-400">{item.daysRemaining} days left</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(item.startDate)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(item.expiryDate)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(item.createdAt)}</Td>
                    <Td>
                      {item.renewalDue && canRemind ? (
                        <SendReminderButton
                          action={sendRenewalReminderAction.bind(null, item._id.toString())}
                          email={item.registration?.email ?? ""}
                          lastSent={item.renewalReminderSentAt ? formatAdminDate(item.renewalReminderSentAt) : null}
                        />
                      ) : item.renewalDue ? (
                        <span className="text-xs text-amber-700">Ends soon</span>
                      ) : null}
                    </Td>
                    <Td align="right">
                      <RowActions>
                        <ButtonLink href={href} variant="ghost" size="sm" aria-label={`Open ${item.registration?.childName || item.registration?.name}`}>
                          Open
                          <ChevronRightIcon />
                        </ButtonLink>
                      </RowActions>
                    </Td>
                  </Tr>
                );
              })}
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
          noun="registrations"
        />
      </Card>
    </div>
  );
}
