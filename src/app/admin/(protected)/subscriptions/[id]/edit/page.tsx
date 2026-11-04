import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { getSubscriptionPlan } from "@/services/subscription.service";
import { SubscriptionForm } from "../../subscription-form";
import { updateSubscriptionAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Subscription Plan" };

export default async function EditSubscriptionPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "subscriptions")) redirect("/admin/dashboard");
  const { id } = await params;
  const plan = await getSubscriptionPlan(id);
  if (!plan) notFound();
  return <div className="flex flex-col gap-6">
    <PageHeader title="Edit subscription plan" description={plan.name} back={{ href: "/admin/subscriptions", label: "All plans" }} meta={<StatusBadge status={plan.status} />} />
    <SubscriptionForm action={updateSubscriptionAction.bind(null, id)} submitLabel="Save changes" defaultValues={{
      name: plan.name, description: plan.description, ageGroup: plan.ageGroup,
      price: plan.price, durationMonths: plan.durationMonths, journalCount: plan.journalCount,
      features: plan.features, registrationUrl: plan.registrationUrl, badge: plan.badge ?? "", buttonLabel: plan.buttonLabel ?? "", featured: plan.featured,
      displayOrder: plan.displayOrder, status: plan.status,
    }} />
  </div>;
}
