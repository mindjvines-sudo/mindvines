import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/admin/ui/badge";
import { PILOT_AVAILABILITY_LABELS, pilotAvailability } from "@/lib/pilot";
import { getPilotPlan, listBasePlanOptions } from "@/services/pilot.service";
import { PilotForm } from "../../pilot-form";
import { updatePilotPlanAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Pilot Plan" };

/** A stored instant as the India calendar day the admin typed. */
const istDay = (date: Date) => new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default async function EditPilotPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "pilotPlans")) redirect("/admin/dashboard");
  const { id } = await params;
  const [plan, basePlans] = await Promise.all([getPilotPlan(id), listBasePlanOptions()]);
  if (!plan) notFound();
  const options = basePlans.map((item) => ({ id: item._id.toString(), label: `Ages ${item.ageGroup} · ${item.name} (${item.durationMonths} mo)` }));
  // A plan whose base plan was since unpublished keeps working; keep it selectable.
  if (!options.some((option) => option.id === plan.basePlan.toString())) options.push({ id: plan.basePlan.toString(), label: "Current plan (not published)" });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edit pilot plan"
        description={plan.name}
        back={{ href: "/admin/pilot", label: "Pilot registration" }}
        meta={<Badge tone={plan.status === "ACTIVE" ? "green" : "slate"}>{PILOT_AVAILABILITY_LABELS[pilotAvailability(plan)]}</Badge>}
      />
      <PilotForm
        action={updatePilotPlanAction.bind(null, id)}
        submitLabel="Save changes"
        basePlans={options}
        locked={plan.registrationCount + (plan.reservedCount ?? 0)}
        defaultValues={{
          name: plan.name,
          description: plan.description ?? "",
          basePlan: plan.basePlan.toString(),
          duration: plan.duration,
          customDuration: plan.customDuration ?? undefined,
          originalPrice: plan.originalPrice,
          discountType: plan.discountType,
          discountValue: plan.discountValue,
          maxRegistrations: plan.maxRegistrations,
          startDate: istDay(plan.startDate),
          endDate: istDay(plan.endDate),
          status: plan.status,
          eligibilityType: plan.eligibilityType,
          accessCode: plan.accessCode ?? "",
          allowedEmails: (plan.allowedEmails ?? []).join("\n"),
          maxPerEmail: plan.maxPerEmail,
          termsAndConditions: plan.termsAndConditions ?? "",
        }}
      />
    </div>
  );
}
