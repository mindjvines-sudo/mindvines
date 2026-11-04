import type { Metadata } from "next";
import Link from "next/link";
import { getServiceStats, listServicesAdmin } from "@/services/service.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/constants";
import { asPopulatedMedia } from "@/types/media";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import { deleteServiceAction, reorderServiceAction } from "./actions";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge, statusLabel } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { FilterTabs, Pagination, SearchForm, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ActionButton, ConfirmAction } from "@/components/admin/ui/confirm-action";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  EyeIcon,
  HeartPulseIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/admin/icons";

export const metadata: Metadata = { title: "Services" };

function parseStatus(value: string | undefined): ContentStatus | undefined {
  return CONTENT_STATUSES.includes(value as ContentStatus) ? (value as ContentStatus) : undefined;
}

export default async function ServicesListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const search = params.search?.trim() || undefined;
  const [user, result, stats] = await Promise.all([
    getCurrentUser(),
    listServicesAdmin({ page: params.page, limit: 50, status, search }),
    getServiceStats(),
  ]);

  const canCreate = can(user.role, "create", "services");
  const canDelete = can(user.role, "delete", "services");
  const canReorder = can(user.role, "update", "services");
  // Reordering swaps neighbours in the full list, so it's offered only when
  // the table shows that full list.
  const showOrder = canReorder && !status && !search && result.pages <= 1;
  const counts: Record<ContentStatus, number> = {
    PUBLISHED: stats.published,
    DRAFT: stats.draft,
    ARCHIVED: stats.archived,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Services"
        description="Services listed on /services, each with its own page, in the order below."
        actions={
          <>
            <ButtonLink href="/services" target="_blank" rel="noopener" variant="secondary">
              <ExternalLinkIcon />
              View page
            </ButtonLink>
            {canCreate && (
              <ButtonLink href="/admin/services/new">
                <PlusIcon />
                Add service
              </ButtonLink>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <FilterTabs
            label="Filter by status"
            tabs={[
              { label: "All", href: hrefWith("/admin/services", { search }), active: !status, count: stats.total },
              ...CONTENT_STATUSES.map((s) => ({
                label: statusLabel(s),
                href: hrefWith("/admin/services", { status: s, search }),
                active: status === s,
                count: counts[s],
              })),
            ]}
          />
          <SearchForm placeholder="Search by name" defaultValue={search} keep={{ status }} />
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            icon={HeartPulseIcon}
            title={search || status ? "No matching services" : "No services yet"}
            description={
              search || status
                ? "Try a different search or status filter."
                : "Add your first service to list it on the website with its own page."
            }
            action={
              search || status ? (
                <ButtonLink href="/admin/services" variant="secondary">
                  Clear filters
                </ButtonLink>
              ) : canCreate ? (
                <ButtonLink href="/admin/services/new">
                  <PlusIcon />
                  Add service
                </ButtonLink>
              ) : undefined
            }
            className="border-t border-line"
          />
        ) : (
          <Table minWidth={560}>
            <THead>
              <tr>
                {showOrder && <Th className="w-[88px]">Order</Th>}
                <Th>Service</Th>
                <Th>Status</Th>
                <Th hideBelow="md">Updated</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item, index) => {
                const id = item._id.toString();
                const image = asPopulatedMedia(item.image);
                return (
                  <Tr key={id}>
                    {showOrder && (
                      <Td>
                        <div className="flex items-center gap-0.5">
                          <span className="w-5 text-xs tabular-nums text-slate-400">{index + 1}</span>
                          {index > 0 ? (
                            <form action={reorderServiceAction.bind(null, id, "up")}>
                              <ActionButton variant="ghost" label={`Move ${item.name} up`}>
                                <ArrowUpIcon />
                              </ActionButton>
                            </form>
                          ) : (
                            <span className="size-8" />
                          )}
                          {index < result.items.length - 1 && (
                            <form action={reorderServiceAction.bind(null, id, "down")}>
                              <ActionButton variant="ghost" label={`Move ${item.name} down`}>
                                <ArrowDownIcon />
                              </ActionButton>
                            </form>
                          )}
                        </div>
                      </Td>
                    )}
                    <Td>
                      <div className="flex items-center gap-3.5">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin list thumbnail
                          <img
                            src={cloudinaryThumbnail(image.secureUrl, 96)}
                            alt=""
                            className="size-11 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
                            <HeartPulseIcon className="size-5" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/admin/services/${id}/edit`}
                            className="line-clamp-1 font-medium text-navy-900 hover:text-primary-700"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-0.5 truncate text-xs text-slate-400">/services/{item.slug}</p>
                        </div>
                      </div>
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
                        {item.status === "PUBLISHED" ? (
                          <ButtonLink
                            href={`/services/${item.slug}`}
                            target="_blank"
                            rel="noopener"
                            variant="ghost"
                            size="sm"
                            aria-label={`View ${item.name} on the website`}
                            title="View on site"
                          >
                            <ExternalLinkIcon />
                          </ButtonLink>
                        ) : (
                          <ButtonLink
                            href={`/admin/services/${id}/preview`}
                            variant="ghost"
                            size="sm"
                            aria-label={`Preview ${item.name}`}
                            title="Preview"
                          >
                            <EyeIcon />
                          </ButtonLink>
                        )}
                        <ButtonLink
                          href={`/admin/services/${id}/edit`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${item.name}`}
                          title="Edit"
                        >
                          <PencilIcon />
                        </ButtonLink>
                        {canDelete && (
                          <ConfirmAction
                            action={deleteServiceAction.bind(null, id)}
                            title="Delete this service?"
                            description={`“${item.name}” and its page will be permanently removed from the website. This can’t be undone.`}
                            confirmLabel="Delete service"
                            triggerLabel={`Delete ${item.name}`}
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

        <Pagination
          path="/admin/services"
          page={result.page}
          pages={result.pages}
          total={result.total}
          limit={result.limit}
          params={{ status, search }}
          noun="services"
        />
      </Card>
    </div>
  );
}
