import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { SubscriptionForm } from "../subscription-form";
import { createSubscriptionAction } from "../actions";

export const metadata: Metadata = { title: "Add Subscription Plan" };

export default async function NewSubscriptionPlanPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "subscriptions")) redirect("/admin/dashboard");
  return <div className="flex flex-col gap-6">
    <PageHeader title="Add subscription plan" back={{ href: "/admin/subscriptions", label: "All plans" }} />
    <SubscriptionForm action={createSubscriptionAction} submitLabel="Create plan" />
  </div>;
}
