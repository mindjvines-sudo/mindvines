import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { formatPlanPrice } from "@/lib/subscriptions";
import { listSubscriptionPlansAdmin } from "@/services/subscription.service";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge, Badge } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";
import { deleteSubscriptionAction } from "./actions";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionPlansPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "subscriptions")) redirect("/admin/dashboard");
  const plans = await listSubscriptionPlansAdmin();
  const canCreate = can(user.role, "create", "subscriptions");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Subscriptions" description="Manage journal subscription plans. Published plans appear on the homepage and subscription plans page."
        actions={<><ButtonLink href="/subscriptions" variant="secondary">View website</ButtonLink>{canCreate && <ButtonLink href="/admin/subscriptions/new"><PlusIcon />Add plan</ButtonLink>}</>} />
      <Card className="overflow-hidden">
        {plans.length === 0 ? (
          <EmptyState title="No subscription plans yet" description="Create a plan with pricing and benefits, then publish it to show it on the website."
            action={canCreate ? <ButtonLink href="/admin/subscriptions/new"><PlusIcon />Add plan</ButtonLink> : undefined} />
        ) : (
          <Table minWidth={750}>
            <THead><tr><Th>Plan</Th><Th>Age group</Th><Th>Price</Th><Th>Duration</Th><Th>Order</Th><Th>Status</Th><Th align="right">Actions</Th></tr></THead>
            <TBody>
              {plans.map((plan) => {
                const id = plan._id.toString();
                return <Tr key={id}>
                  <Td><span className="font-medium text-navy-900">{plan.name}</span>{plan.featured && <div className="mt-1"><Badge tone="violet">Recommended</Badge></div>}</Td>
                  <Td>Ages {plan.ageGroup}</Td><Td>{formatPlanPrice(plan.price)}</Td>
                  <Td>{plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}<span className="block text-xs text-slate-500">{plan.journalCount} journals</span></Td>
                  <Td>{plan.displayOrder}</Td><Td><StatusBadge status={plan.status} /></Td>
                  <Td align="right"><RowActions>
                    {can(user.role, "update", "subscriptions") && <ButtonLink href={`/admin/subscriptions/${id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${plan.name}`}><PencilIcon /></ButtonLink>}
                    {can(user.role, "delete", "subscriptions") && <ConfirmAction action={deleteSubscriptionAction.bind(null, id)} title="Delete this plan?" description={`${plan.name} will be permanently removed from the admin and website.`} confirmLabel="Delete plan" triggerLabel={`Delete ${plan.name}`} trigger={<TrashIcon />} />}
                  </RowActions></Td>
                </Tr>;
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
