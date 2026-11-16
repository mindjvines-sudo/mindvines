import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listCmsPagesAdmin } from "@/services/cms-page.service";
import { duplicatePageAction, deletePageAction } from "./actions";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge, StatusBadge } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { FilterTabs, SearchForm, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { Button, ButtonLink } from "@/components/admin/ui/button";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { DocumentIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Pages" };

const STATUSES = ["PUBLISHED", "DRAFT", "SCHEDULED", "UNPUBLISHED"] as const;
const TYPES = ["CMS", "SYSTEM"] as const;
const when = (value: Date | string | null) =>
  value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default async function PagesListPage({ searchParams }: { searchParams: Promise<{ status?: string; type?: string; q?: string }> }) {
  const params = await searchParams;
  const status = STATUSES.find((value) => value === params.status);
  const type = TYPES.find((value) => value === params.type);
  const q = params.q?.trim() || undefined;
  const user = await getCurrentUser();
  const result = await listCmsPagesAdmin({ status, type, search: q }, user.id);

  const canCreate = can(user.role, "create", "pages");
  const canDelete = can(user.role, "delete", "pages");
  const empty = result.cms.length === 0 && result.system.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pages"
        description="Edit every page of the website, built-in or new, with the page builder. Changes stay as drafts until you publish them."
        actions={
          canCreate && (
            <ButtonLink href="/admin/pages/new">
              <PlusIcon />
              Create page
            </ButtonLink>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <FilterTabs
            label="Filter by status"
            tabs={[
              { label: "All", href: hrefWith("/admin/pages", { type, q }), active: !status },
              ...STATUSES.map((s) => ({ label: s[0] + s.slice(1).toLowerCase(), href: hrefWith("/admin/pages", { status: s, type, q }), active: status === s })),
            ]}
          />
          <FilterTabs
            label="Filter by type"
            tabs={[
              { label: "All types", href: hrefWith("/admin/pages", { status, q }), active: !type },
              { label: "Custom pages", href: hrefWith("/admin/pages", { status, type: "CMS", q }), active: type === "CMS" },
              { label: "System pages", href: hrefWith("/admin/pages", { status, type: "SYSTEM", q }), active: type === "SYSTEM" },
            ]}
          />
          <SearchForm placeholder="Search by name or address" defaultValue={q} keep={{ status, type }} />
        </div>

        {empty ? (
          <EmptyState icon={DocumentIcon} title="No pages match" className="border-t border-line" />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Page name</Th>
                <Th hideBelow="md">URL</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th hideBelow="lg">Last updated</Th>
                <Th hideBelow="lg">Updated by</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {result.cms.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    <Link href={`/admin/pages/${item.id}/edit`} className="font-medium text-navy-900 hover:text-primary-700">
                      {item.title}
                    </Link>
                    {item.hasDraft && item.status === "PUBLISHED" && <p className="mt-0.5 text-xs text-amber-700">Unpublished changes</p>}
                    {item.status === "SCHEDULED" && <p className="mt-0.5 text-xs text-slate-500">Goes live {when(item.publishAt)}</p>}
                  </Td>
                  <Td hideBelow="md" className="text-slate-500">/{item.slug}</Td>
                  <Td><Badge tone="teal" dot={false}>Custom</Badge></Td>
                  <Td><StatusBadge status={item.status} /></Td>
                  <Td hideBelow="lg" className="whitespace-nowrap tabular-nums">{when(item.updatedAt)}</Td>
                  <Td hideBelow="lg">{item.updatedBy ?? "—"}</Td>
                  <Td align="right">
                    <RowActions>
                      <ButtonLink href={`/admin/pages/${item.id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${item.title}`} title="Edit page">
                        <PencilIcon />
                        <span className="ml-1.5">Edit</span>
                      </ButtonLink>
                      <ButtonLink href={`/preview/${item.id}`} variant="ghost" size="sm" target="_blank" rel="noopener">Preview</ButtonLink>
                      {item.status === "PUBLISHED" && <ButtonLink href={`/${item.slug}`} variant="ghost" size="sm" target="_blank" rel="noopener">View live</ButtonLink>}
                      <ButtonLink href={`/admin/pages/${item.id}/versions`} variant="ghost" size="sm">History</ButtonLink>
                      {canCreate && (
                        <form action={duplicatePageAction.bind(null, item.id)}>
                          <Button type="submit" variant="ghost" size="sm">Duplicate</Button>
                        </form>
                      )}
                      {canDelete && (
                        <ConfirmAction
                          action={deletePageAction.bind(null, item.id)}
                          title="Delete this page?"
                          description={`“${item.title}” and its version history will be permanently removed, and /${item.slug} will stop working. This can’t be undone.`}
                          confirmLabel="Delete page"
                          triggerLabel={`Delete ${item.title}`}
                          trigger={<TrashIcon />}
                        />
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
              {result.system.map((item) => (
                <Tr key={item.key}>
                  <Td>
                    <Link href={`/admin/pages/system/${item.key}/edit`} className="font-medium text-navy-900 hover:text-primary-700">
                      {item.title}
                    </Link>
                    {item.hasDraft && <p className="mt-0.5 text-xs text-amber-700">Unpublished changes</p>}
                    {!item.hasDraft && item.customised && <p className="mt-0.5 text-xs text-slate-500">Edited in the page builder</p>}
                  </Td>
                  <Td hideBelow="md" className="text-slate-500">{item.path}</Td>
                  <Td><Badge tone="slate" dot={false}>System</Badge></Td>
                  <Td><StatusBadge status="PUBLISHED" /></Td>
                  <Td hideBelow="lg" className="whitespace-nowrap tabular-nums">{when(item.updatedAt)}</Td>
                  <Td hideBelow="lg">{item.updatedBy ?? "—"}</Td>
                  <Td align="right">
                    <RowActions>
                      <ButtonLink href={`/admin/pages/system/${item.key}/edit`} variant="ghost" size="sm" title="Edit page"><PencilIcon /><span className="ml-1.5">Edit</span></ButtonLink>
                      <ButtonLink href={`/admin/pages/system/${item.key}`} variant="ghost" size="sm">SEO</ButtonLink>
                      {item.id && <ButtonLink href={`/preview/${item.id}`} variant="ghost" size="sm" target="_blank" rel="noopener">Preview</ButtonLink>}
                      <ButtonLink href={item.path} variant="ghost" size="sm" target="_blank" rel="noopener">View live</ButtonLink>
                      {item.id && <ButtonLink href={`/admin/pages/${item.id}/versions`} variant="ghost" size="sm">History</ButtonLink>}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
