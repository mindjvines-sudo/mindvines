import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listProgrammesAdmin } from "@/services/programme.service";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { Pagination } from "@/components/admin/ui/list-controls";
import { ButtonLink } from "@/components/admin/ui/button";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";
import { deleteProgrammeAction } from "./actions";

export const metadata: Metadata = { title: "Programme Management" };

export default async function ProgrammesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "programmes")) redirect("/admin/dashboard");
  const { page } = await searchParams;
  const result = await listProgrammesAdmin({ page });
  const programmes = result.items;
  const canCreate = can(user.role, "create", "programmes");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Programme Management"
        description="What children take part in. Each plan belongs to a programme, and the programme decides which topic lists families pick from."
        actions={canCreate ? <ButtonLink href="/admin/programmes/new"><PlusIcon />Add programme</ButtonLink> : undefined}
      />
      <Card className="overflow-hidden">
        {programmes.length === 0 ? (
          <EmptyState
            title="No programmes yet"
            description="Add a programme, then link subscription plans to it."
            action={canCreate ? <ButtonLink href="/admin/programmes/new"><PlusIcon />Add programme</ButtonLink> : undefined}
          />
        ) : (
          <Table minWidth={680}>
            <THead><tr><Th>Programme</Th><Th>Age group</Th><Th>Topic lists</Th><Th hideBelow="sm">Plans</Th><Th>Status</Th><Th align="right">Actions</Th></tr></THead>
            <TBody>
              {programmes.map((programme) => {
                const id = programme._id.toString();
                return (
                  <Tr key={id}>
                    <Td>
                      <span className="font-medium text-navy-900">{programme.name}</span>
                      {programme.description && <span className="block max-w-[280px] truncate text-xs text-slate-500">{programme.description}</span>}
                    </Td>
                    <Td>Ages {programme.ageGroup}</Td>
                    <Td className="text-sm text-slate-700">{programme.categories.map((category) => category.name).join(", ") || "—"}</Td>
                    <Td hideBelow="sm" className="tabular-nums">{programme.planCount}</Td>
                    <Td>{programme.active ? <Badge tone="green">Offered</Badge> : <Badge tone="slate">Switched off</Badge>}</Td>
                    <Td align="right">
                      <RowActions>
                        {can(user.role, "update", "programmes") && (
                          <ButtonLink href={`/admin/programmes/${id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${programme.name}`}><PencilIcon /></ButtonLink>
                        )}
                        {can(user.role, "delete", "programmes") && programme.planCount === 0 && (
                          <ConfirmAction
                            action={deleteProgrammeAction.bind(null, id)}
                            title="Delete this programme?"
                            description={`${programme.name} (ages ${programme.ageGroup}) will be removed. No plans use it.`}
                            confirmLabel="Delete programme"
                            triggerLabel={`Delete ${programme.name}`}
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
        <Pagination path="/admin/programmes" page={result.page} pages={result.pages} total={result.total} limit={result.limit} noun="programmes" />
      </Card>
    </div>
  );
}
