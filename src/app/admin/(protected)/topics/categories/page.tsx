import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listTopicCategoriesPage } from "@/services/topic.service";
import { Pagination } from "@/components/admin/ui/list-controls";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";
import { deleteCategoryAction } from "../actions";

export const metadata: Metadata = { title: "Topic Categories" };

export default async function TopicCategoriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "topics")) redirect("/admin/dashboard");
  const { page } = await searchParams;
  const result = await listTopicCategoriesPage({ page });
  const categories = result.items;
  const canCreate = can(user.role, "create", "topics");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Topic categories"
        description="Each category is one list on page 2 of the registration form, with its own heading, description and number of picks."
        back={{ href: "/admin/topics", label: "Topic Management" }}
        actions={canCreate ? <ButtonLink href="/admin/topics/categories/new"><PlusIcon />Add category</ButtonLink> : undefined}
      />
      <Card className="overflow-hidden">
        {categories.length === 0 ? (
          <EmptyState title="No categories yet" description="Add a category, then add topics to it." />
        ) : (
          <Table minWidth={640}>
            <THead><tr><Th>Category</Th><Th hideBelow="md">Heading shown to parents</Th><Th>Picks</Th><Th>Status</Th><Th align="right">Actions</Th></tr></THead>
            <TBody>
              {categories.map((category) => {
                const id = category._id.toString();
                return (
                  <Tr key={id}>
                    <Td><span className="font-medium text-navy-900">{category.name}</span></Td>
                    <Td hideBelow="md" className="text-sm text-slate-600">{category.heading}</Td>
                    <Td className="tabular-nums">{category.selectionLimit}</Td>
                    <Td>{category.active ? <Badge tone="green">Shown</Badge> : <Badge tone="slate">Hidden</Badge>}</Td>
                    <Td align="right">
                      <RowActions>
                        {can(user.role, "update", "topics") && (
                          <ButtonLink href={`/admin/topics/categories/${id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${category.name}`}><PencilIcon /></ButtonLink>
                        )}
                        {can(user.role, "delete", "topics") && (
                          <ConfirmAction
                            action={deleteCategoryAction.bind(null, id)}
                            title="Delete this category?"
                            description="Only possible while it has no topics and no programme uses it. Otherwise, switch it off."
                            confirmLabel="Delete category"
                            triggerLabel={`Delete ${category.name}`}
                            trigger={<TrashIcon />}
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
        <Pagination path="/admin/topics/categories" page={result.page} pages={result.pages} total={result.total} limit={result.limit} noun="categories" />
      </Card>
    </div>
  );
}
