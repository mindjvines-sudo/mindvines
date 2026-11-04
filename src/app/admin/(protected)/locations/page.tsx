import type { Metadata } from "next";
import Link from "next/link";
import { listLocationsAdmin } from "@/services/location.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { deleteLocationAction, reorderLocationAction, setLocationStatusAction } from "./actions";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { Alert, EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ActionButton, ConfirmAction } from "@/components/admin/ui/confirm-action";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/admin/icons";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsListPage() {
  const [user, items] = await Promise.all([getCurrentUser(), listLocationsAdmin()]);

  const canCreate = can(user.role, "create", "locations");
  const canDelete = can(user.role, "delete", "locations");
  const canPublish = can(user.role, "publish", "locations");
  const canReorder = can(user.role, "update", "locations");
  const publishedCount = items.filter((item) => item.status === "PUBLISHED").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Locations"
        description="Clinics in the website’s Locations menu, each with its own page, in the order below."
        actions={
          canCreate && (
            <ButtonLink href="/admin/locations/new">
              <PlusIcon />
              Add location
            </ButtonLink>
          )
        }
      />

      {items.length > 0 && publishedCount === 0 && (
        <Alert tone="info" title="No locations are published yet">
          The website keeps showing its built-in Sadanandanagar and Kasturi Nagar pages until at least one here is
          published.
        </Alert>
      )}

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={MapPinIcon}
            title="No locations yet"
            description="Add a clinic to give it a page and a place in the Locations menu. Until then, the built-in clinic pages are shown."
            action={
              canCreate ? (
                <ButtonLink href="/admin/locations/new">
                  <PlusIcon />
                  Add location
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <Table minWidth={600}>
            <THead>
              <tr>
                {canReorder && <Th className="w-[88px]">Order</Th>}
                <Th>Clinic</Th>
                <Th hideBelow="lg">Address</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {items.map((item, index) => {
                const id = item._id.toString();
                return (
                  <Tr key={id}>
                    {canReorder && (
                      <Td>
                        <div className="flex items-center gap-0.5">
                          <span className="w-5 text-xs tabular-nums text-slate-400">{index + 1}</span>
                          {index > 0 ? (
                            <form action={reorderLocationAction.bind(null, id, "up")}>
                              <ActionButton variant="ghost" label={`Move ${item.name} up`}>
                                <ArrowUpIcon />
                              </ActionButton>
                            </form>
                          ) : (
                            <span className="size-8" />
                          )}
                          {index < items.length - 1 && (
                            <form action={reorderLocationAction.bind(null, id, "down")}>
                              <ActionButton variant="ghost" label={`Move ${item.name} down`}>
                                <ArrowDownIcon />
                              </ActionButton>
                            </form>
                          )}
                        </div>
                      </Td>
                    )}
                    <Td>
                      <Link href={`/admin/locations/${id}/edit`} className="group flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
                          <MapPinIcon className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900 group-hover:text-primary-700">
                            {item.name}
                          </span>
                          <span className="block truncate text-xs text-slate-400">/{item.slug}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td hideBelow="lg">
                      <span className="text-[13px] text-slate-700">
                        {[item.address?.street, item.address?.area].filter(Boolean).join(", ") || "—"}
                      </span>
                    </Td>
                    <Td>
                      <StatusBadge status={item.status} />
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {canPublish && item.status !== "PUBLISHED" && (
                          <form action={setLocationStatusAction.bind(null, id, "PUBLISHED")}>
                            <ActionButton variant="success-soft" pendingLabel="…">
                              Publish
                            </ActionButton>
                          </form>
                        )}
                        {item.status === "PUBLISHED" && (
                          <ButtonLink
                            href={`/${item.slug}`}
                            target="_blank"
                            rel="noopener"
                            variant="ghost"
                            size="sm"
                            aria-label={`View ${item.name} on the website`}
                            title="View on site"
                          >
                            <ExternalLinkIcon />
                          </ButtonLink>
                        )}
                        <ButtonLink
                          href={`/admin/locations/${id}/edit`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${item.name}`}
                          title="Edit"
                        >
                          <PencilIcon />
                        </ButtonLink>
                        {canDelete && (
                          <ConfirmAction
                            action={deleteLocationAction.bind(null, id)}
                            title="Delete this location?"
                            description={`${item.name} and its page will be permanently removed from the website and the Locations menu. This can’t be undone.`}
                            confirmLabel="Delete location"
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
      </Card>
    </div>
  );
}
