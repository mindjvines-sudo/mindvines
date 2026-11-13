import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { listBasePlanOptions } from "@/services/pilot.service";
import { PilotForm } from "../pilot-form";
import { createPilotPlanAction } from "../actions";

export const metadata: Metadata = { title: "Add Pilot Plan" };

export default async function NewPilotPlanPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "pilotPlans")) redirect("/admin/dashboard");
  const plans = await listBasePlanOptions();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add pilot plan" back={{ href: "/admin/pilot", label: "Pilot registration" }} />
      <PilotForm
        action={createPilotPlanAction}
        submitLabel="Create pilot plan"
        basePlans={plans.map((plan) => ({ id: plan._id.toString(), label: `Ages ${plan.ageGroup} · ${plan.name} (${plan.durationMonths} mo)` }))}
      />
    </div>
  );
}
