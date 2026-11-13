import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PILOT_AVAILABILITY_LABELS, PILOT_ELIGIBILITY_LABELS, type PilotAvailability } from "@/lib/pilot";
import { formatPlanPrice } from "@/lib/subscriptions";
import { formatPaise } from "@/lib/subscription-status";
import { listPilotPlansAdmin } from "@/services/pilot.service";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge, type BadgeTone } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { StatTile } from "@/components/admin/stat-tile";
import { formatAdminDate } from "@/components/admin/subscription-badges";
import { CheckCircleIcon, ChartIcon, ClockIcon, DocumentIcon, PencilIcon, PeopleIcon, PlusIcon, StarIcon } from "@/components/admin/icons";
import { setPilotPlanStatusAction } from "./actions";

export const metadata: Metadata = { title: "Pilot Registration" };

const TONES: Record<PilotAvailability, BadgeTone> = { OPEN: "green", FULLY_BOOKED: "amber", NOT_STARTED: "blue", ENDED: "slate", INACTIVE: "slate" };

export default async function PilotRegistrationPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "pilotPlans")) redirect("/admin/dashboard");
  const canCreate = can(user.role, "create", "pilotPlans");
  const canUpdate = can(user.role, "update", "pilotPlans");
  const { items, summary } = await listPilotPlansAdmin();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pilot Registration"
        description="Limited-time offers with their own price, duration, slot limit and eligibility. Standard subscriptions are not affected."
        actions={canCreate ? <ButtonLink href="/admin/pilot/new"><PlusIcon />Add pilot plan</ButtonLink> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={DocumentIcon} label="Pilot plans" value={String(summary.totalPlans)} color="blue" note={`${summary.activePlans} active`} />
        <StatTile icon={PeopleIcon} label="Pilot registrations" value={String(summary.totalRegistrations)} color="teal" note={summary.pendingPayments ? `${summary.pendingPayments} awaiting payment` : "Paid and confirmed"} />
        <StatTile icon={CheckCircleIcon} label="Available slots" value={String(summary.availableSlots)} color="green" note="Across open plans" />
        <StatTile icon={ClockIcon} label="Fully booked plans" value={String(summary.fullyBooked)} color="amber" />
        <StatTile icon={ChartIcon} label="Pilot revenue" value={formatPaise(summary.revenue)} color="violet" note="Paid, GST included" />
      </div>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            title="No pilot plans yet"
            description="Create a pilot plan with its own price, slot limit and registration window, then switch it on."
            action={canCreate ? <ButtonLink href="/admin/pilot/new"><PlusIcon />Add pilot plan</ButtonLink> : undefined}
          />
        ) : (
          <Table minWidth={1050}>
            <THead>
              <tr><Th>Plan</Th><Th>Duration</Th><Th>Price</Th><Th>Registrations</Th><Th>Window</Th><Th>Access</Th><Th>Status</Th><Th>Revenue</Th><Th align="right">Actions</Th></tr>
            </THead>
            <TBody>
              {items.map((plan) => {
                const id = plan._id.toString();
                const filled = Math.min(100, Math.round(((plan.registrationCount + (plan.reservedCount ?? 0)) / plan.maxRegistrations) * 100));
                return (
                  <Tr key={id}>
                    <Td><Link href={`/admin/pilot/${id}/registrations`} className="font-medium text-navy-900 hover:text-primary-700">{plan.name}</Link></Td>
                    <Td>{plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}</Td>
                    <Td>
                      <span className="font-medium text-navy-900">{formatPlanPrice(plan.offerPrice)}</span>
                      <span className="block text-xs text-slate-400 line-through">{formatPlanPrice(plan.originalPrice)}</span>
                    </Td>
                    <Td>
                      <span className="tabular-nums">{plan.registrationCount} / {plan.maxRegistrations}</span>
                      <span className="block text-xs text-slate-500">{plan.slotsLeft} left{plan.reservedCount ? ` · ${plan.reservedCount} awaiting payment` : ""}</span>
                      <span aria-hidden className="mt-1 block h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-primary-500" style={{ width: `${filled}%` }} /></span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs tabular-nums">{formatAdminDate(plan.startDate)}<span className="block">to {formatAdminDate(plan.endDate)}</span></Td>
                    <Td className="text-xs">{PILOT_ELIGIBILITY_LABELS[plan.eligibilityType].split(":")[0]}{plan.accessCode && <span className="block font-mono text-slate-500">{plan.accessCode}</span>}</Td>
                    <Td><Badge tone={TONES[plan.availability]}>{PILOT_AVAILABILITY_LABELS[plan.availability]}</Badge></Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatPaise(plan.revenue)}</Td>
                    <Td align="right">
                      <RowActions>
                        <ButtonLink href={`/admin/pilot/${id}/registrations`} variant="ghost" size="sm">Registrations</ButtonLink>
                        {canUpdate && <ButtonLink href={`/admin/pilot/${id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${plan.name}`}><PencilIcon /></ButtonLink>}
                        {canUpdate && (
                          <ConfirmAction
                            action={setPilotPlanStatusAction.bind(null, id, plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                            title={plan.status === "ACTIVE" ? "Deactivate this plan?" : "Activate this plan?"}
                            description={plan.status === "ACTIVE" ? `${plan.name} will stop taking new registrations. Existing registrations are not affected.` : `${plan.name} will take registrations during its window.`}
                            confirmLabel={plan.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            triggerLabel={`${plan.status === "ACTIVE" ? "Deactivate" : "Activate"} ${plan.name}`}
                            trigger={plan.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            variant="secondary"
                          />
                        )}
                      </RowActions>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
      <p className="text-xs text-slate-500">
        <StarIcon className="mr-1 inline size-3.5" />
        A plan is shown as fully booked when its confirmed registrations and slots held for payments reach the limit. Held slots are released automatically if a payment isn&apos;t completed, and a cancelled or refunded registration reopens its slot.
      </p>
    </div>
  );
}
