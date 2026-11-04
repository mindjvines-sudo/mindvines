import type { Metadata } from "next";
import Link from "next/link";
import { listPagesAdmin } from "@/services/page.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/constants";
import { deletePageAction } from "./actions";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge, statusLabel } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { FilterTabs, Pagination, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { DocumentIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Pages" };

function parseStatus(value: string | undefined): ContentStatus | undefined {
  return CONTENT_STATUSES.includes(value as ContentStatus) ? (value as ContentStatus) : undefined;
}

export default async function PagesListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const [user, result] = await Promise.all([getCurrentUser(), listPagesAdmin({ page: params.page, status })]);

  const canCreate = can(user.role, "create", "pages");
  const canDelete = can(user.role, "delete", "pages");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pages"
        description="Standalone content pages on the website."
        actions={
          canCreate && (
            <ButtonLink href="/admin/pages/new">
              <PlusIcon />
              New page
            </ButtonLink>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <FilterTabs
            label="Filter by status"
            tabs={[
              { label: "All", href: "/admin/pages", active: !status },
              ...CONTENT_STATUSES.map((s) => ({
                label: statusLabel(s),
                href: hrefWith("/admin/pages", { status: s }),
                active: status === s,
              })),
            ]}
          />
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            icon={DocumentIcon}
            title={status ? "No pages with this status" : "No pages yet"}
            action={
              canCreate && !status ? (
                <ButtonLink href="/admin/pages/new">
                  <PlusIcon />
                  New page
                </ButtonLink>
              ) : undefined
            }
            className="border-t border-line"
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Page</Th>
                <Th>Status</Th>
                <Th hideBelow="md">Updated</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <Link href={`/admin/pages/${item.id}/edit`} className="font-medium text-navy-900 hover:text-primary-700">
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-400">/{item.slug}</p>
                  </Td>
                  <Td>
                    <StatusBadge status={item.status} />
                  </Td>
                  <Td hideBelow="md" className="whitespace-nowrap tabular-nums">
                    {new Date(item.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <ButtonLink
                        href={`/admin/pages/${item.id}/edit`}
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${item.title}`}
                        title="Edit"
                      >
                        <PencilIcon />
                      </ButtonLink>
                      {canDelete && (
                        <ConfirmAction
                          action={deletePageAction.bind(null, item.id)}
                          title="Delete this page?"
                          description={`“${item.title}” will be permanently removed. This can’t be undone.`}
                          confirmLabel="Delete page"
                          triggerLabel={`Delete ${item.title}`}
                          trigger={<TrashIcon />}
                        />
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}

        <Pagination
          path="/admin/pages"
          page={result.page}
          pages={result.pages}
          total={result.total}
          limit={result.limit}
          params={{ status }}
          noun="pages"
        />
      </Card>
    </div>
  );
}
