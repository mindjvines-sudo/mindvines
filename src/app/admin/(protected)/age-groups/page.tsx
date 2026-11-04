import type { Metadata } from "next";
import Link from "next/link";
import { listAgeGroupsAdmin } from "@/services/age-group.service";
import { getAgeGroupsHeading } from "@/services/settings.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { AGE_GROUPS } from "@/lib/content";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import { asPopulatedMedia } from "@/types/media";
import { deleteAgeGroupAction, reorderAgeGroupAction, setAgeGroupStatusAction } from "./actions";
import { SectionHeadingForm } from "./section-heading-form";
import { Card, CardHeader } from "@/components/admin/ui/card";
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
  HomeIcon,
  PencilIcon,
  PeopleIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/admin/icons";

export const metadata: Metadata = { title: "Age Groups" };

export default async function AgeGroupsListPage() {
  const [user, items, heading] = await Promise.all([getCurrentUser(), listAgeGroupsAdmin(), getAgeGroupsHeading()]);

  const canCreate = can(user.role, "create", "ageGroups");
  const canDelete = can(user.role, "delete", "ageGroups");
  const canPublish = can(user.role, "publish", "ageGroups");
  const canUpdate = can(user.role, "update", "ageGroups");
  const publishedCount = items.filter((item) => item.status === "PUBLISHED").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Age groups"
        description="The cards in the homepage’s age groups section, each with its own page, in the order below."
        actions={
          canCreate && (
            <ButtonLink href="/admin/age-groups/new">
              <PlusIcon />
              Add age group
            </ButtonLink>
          )
        }
      />

      {publishedCount === 0 && (
        <Alert tone="info" title="No age groups are published yet">
          The homepage keeps showing its built-in Ages 6–8 and Ages 9–12 cards until at least one here is published.
        </Alert>
      )}

      <Card>
        <CardHeader icon={HomeIcon} title="Homepage section" />
        <SectionHeadingForm heading={heading} fallback={AGE_GROUPS.heading} disabled={!canUpdate} />
      </Card>

      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={PeopleIcon}
            title="No age groups yet"
            description="Add an age group to give it a homepage card and its own page."
            action={
              canCreate ? (
                <ButtonLink href="/admin/age-groups/new">
                  <PlusIcon />
                  Add age group
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <Table minWidth={600}>
            <THead>
              <tr>
                {canUpdate && <Th className="w-[88px]">Order</Th>}
                <Th>Age group</Th>
                <Th hideBelow="lg">Subtitle</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {items.map((item, index) => {
                const id = item._id.toString();
                const image = asPopulatedMedia(item.cardImage);
                return (
                  <Tr key={id}>
                    {canUpdate && (
                      <Td>
                        <div className="flex items-center gap-0.5">
                          <span className="w-5 text-xs tabular-nums text-slate-400">{index + 1}</span>
                          {index > 0 ? (
                            <form action={reorderAgeGroupAction.bind(null, id, "up")}>
                              <ActionButton variant="ghost" label={`Move ${item.title} up`}>
                                <ArrowUpIcon />
                              </ActionButton>
                            </form>
                          ) : (
                            <span className="size-8" />
                          )}
                          {index < items.length - 1 && (
                            <form action={reorderAgeGroupAction.bind(null, id, "down")}>
                              <ActionButton variant="ghost" label={`Move ${item.title} down`}>
                                <ArrowDownIcon />
                              </ActionButton>
                            </form>
                          )}
                        </div>
                      </Td>
                    )}
                    <Td>
                      <Link href={`/admin/age-groups/${id}/edit`} className="group flex items-center gap-3">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- small admin list thumbnail
                          <img src={cloudinaryThumbnail(image.secureUrl, 120)} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-600">
                            <PeopleIcon className="size-5" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900 group-hover:text-primary-700">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-slate-400">/age-groups/{item.slug}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td hideBelow="lg">
                      <span className="text-[13px] text-slate-700">{item.subtitle || "—"}</span>
                    </Td>
                    <Td>
                      <StatusBadge status={item.status} />
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {canPublish && item.status !== "PUBLISHED" && (
                          <form action={setAgeGroupStatusAction.bind(null, id, "PUBLISHED")}>
                            <ActionButton variant="success-soft" pendingLabel="…">
                              Publish
                            </ActionButton>
                          </form>
                        )}
                        {item.status === "PUBLISHED" && (
                          <ButtonLink
                            href={`/age-groups/${item.slug}`}
                            target="_blank"
                            rel="noopener"
                            variant="ghost"
                            size="sm"
                            aria-label={`View ${item.title} on the website`}
                            title="View on site"
                          >
                            <ExternalLinkIcon />
                          </ButtonLink>
                        )}
                        <ButtonLink
                          href={`/admin/age-groups/${id}/edit`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${item.title}`}
                          title="Edit"
                        >
                          <PencilIcon />
                        </ButtonLink>
                        {canDelete && (
                          <ConfirmAction
                            action={deleteAgeGroupAction.bind(null, id)}
                            title="Delete this age group?"
                            description={`${item.title}, its homepage card and its page will be permanently removed from the website. This can’t be undone.`}
                            confirmLabel="Delete age group"
                            triggerLabel={`Delete ${item.title}`}
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
