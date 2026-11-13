import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PILOT_AVAILABILITY_LABELS, PILOT_RESERVATION_LABELS, PILOT_RESERVATION_STATUSES, pilotAvailability, slotsLeft, type PilotReservationStatus } from "@/lib/pilot";
import { formatPaise } from "@/lib/subscription-status";
import { listPilotRegistrations } from "@/services/pilot.service";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { FilterTabs, Pagination, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/admin/ui/table";
import { buttonClasses } from "@/components/admin/ui/button";
import { inputClasses } from "@/components/admin/ui/form";
import { formatAdminDate } from "@/components/admin/subscription-badges";
import { InboxIcon, SearchIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Pilot Registrations" };

const TONES: Record<PilotReservationStatus, BadgeTone> = { RESERVED: "blue", CONFIRMED: "green", RELEASED: "slate", CANCELLED: "slate", REFUND_REQUIRED: "red" };

export default async function PilotRegistrationsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "pilotPlans")) redirect("/admin/dashboard");
  const { id } = await params;
  const query = await searchParams;
  const status = PILOT_RESERVATION_STATUSES.find((value) => value === query.status);
  const search = query.search?.trim().slice(0, 80) || undefined;
  const result = await listPilotRegistrations(id, { status, search, page: query.page });
  if (!result) notFound();
  const { plan } = result;
  const base = `/admin/pilot/${id}/registrations`;
  const active = { status, search };
  const needsRefund = result.items.some((row) => row.status === "REFUND_REQUIRED");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={plan.name}
        description={`${PILOT_AVAILABILITY_LABELS[pilotAvailability(plan)]} · ${plan.registrationCount} of ${plan.maxRegistrations} places taken · ${slotsLeft(plan)} left${plan.reservedCount ? ` · ${plan.reservedCount} awaiting payment` : ""}`}
        back={{ href: "/admin/pilot", label: "Pilot registration" }}
        actions={<a href={hrefWith(`/api/admin/pilot/${id}/export`, active)} className={buttonClasses({ variant: "secondary" })}>Export CSV</a>}
      />
      {needsRefund && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Some payments arrived after this plan filled up. They were not activated; please refund them in Razorpay.
        </p>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <FilterTabs
            label="Filter by registration status"
            tabs={[
              { label: "All", href: hrefWith(base, { search }), active: !status },
              ...PILOT_RESERVATION_STATUSES.map((value) => ({ label: PILOT_RESERVATION_LABELS[value], href: hrefWith(base, { search, status: value }), active: status === value })),
            ]}
          />
          <form method="get" role="search" className="relative max-w-md">
            {status && <input type="hidden" name="status" value={status} />}
            <SearchIcon className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
            <input type="search" name="search" defaultValue={search} placeholder="Search by parent email" className={inputClasses(false, "h-10 pl-9")} />
          </form>
        </div>
        {result.items.length === 0 ? (
          <EmptyState icon={InboxIcon} title="No registrations" description={status || search ? "Try a different filter." : "Registrations appear here once a family starts paying for this plan."} className="border-t border-line" />
        ) : (
          <Table minWidth={1000}>
            <THead>
              <tr><Th>Registration</Th><Th>Child / parent</Th><Th>Type</Th><Th>Registered</Th><Th>Starts</Th><Th>Expires</Th><Th>Amount paid</Th><Th>Payment</Th><Th>Status</Th></tr>
            </THead>
            <TBody>
              {result.items.map((row) => {
                const sub = row.subscriptionDoc;
                const href = row.subscription ? `/admin/subscribers/${row.subscription}` : null;
                return (
                  <Tr key={row._id.toString()}>
                    <Td className="whitespace-nowrap font-mono text-xs">{href ? <Link href={href} className="font-medium text-navy-900 hover:text-primary-700">{sub?.reference ?? "Open"}</Link> : "—"}</Td>
                    <Td>
                      <span className="block max-w-[200px] truncate font-medium text-navy-900">{sub?.registration?.childName ?? "—"}</span>
                      <span className="block max-w-[200px] truncate text-xs text-slate-500">{sub?.registration?.name} · {row.email}</span>
                    </Td>
                    <Td><Badge tone="violet">Pilot subscription</Badge></Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(row.registrationDate)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(row.subscriptionStartDate)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(row.subscriptionExpiryDate)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">{row.paymentStatus === "PAID" ? formatPaise(row.amount) : "—"}</Td>
                    <Td><Badge tone={row.paymentStatus === "PAID" ? "green" : row.paymentStatus === "REFUNDED" ? "amber" : "slate"}>{row.paymentStatus === "PAID" ? "Paid" : row.paymentStatus === "REFUNDED" ? "Refunded" : "Not paid"}</Badge></Td>
                    <Td><Badge tone={TONES[row.status]}>{PILOT_RESERVATION_LABELS[row.status]}</Badge></Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
        <Pagination path={base} page={result.page} pages={result.pages} total={result.total} limit={result.limit} params={active} noun="registrations" />
      </Card>
    </div>
  );
}
