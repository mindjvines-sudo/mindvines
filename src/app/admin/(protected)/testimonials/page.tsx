import type { Metadata } from "next";
import Link from "next/link";
import { listTestimonialsAdmin } from "@/services/testimonial.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { asPopulatedMedia } from "@/types/media";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import { deleteTestimonialAction, reorderTestimonialAction, setTestimonialStatusAction } from "./actions";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { Alert, EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ActionButton, ConfirmAction } from "@/components/admin/ui/confirm-action";
import { ArrowDownIcon, ArrowUpIcon, ChatIcon, PencilIcon, PlusIcon, StarIcon, TrashIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Testimonials" };

export default async function TestimonialsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const [user, result] = await Promise.all([
    getCurrentUser(),
    listTestimonialsAdmin({ page: params.page, limit: 50 }),
  ]);

  const canCreate = can(user.role, "create", "testimonials");
  const canDelete = can(user.role, "delete", "testimonials");
  const canPublish = can(user.role, "publish", "testimonials");
  const activeCount = result.items.filter((item) => item.status === "PUBLISHED").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Testimonials"
        description="Patient feedback shown on the Home and About pages, in the order below."
        actions={
          canCreate && (
            <ButtonLink href="/admin/testimonials/new">
              <PlusIcon />
              Add testimonial
            </ButtonLink>
          )
        }
      />

      {result.items.length > 0 && activeCount === 0 && (
        <Alert tone="info" title="No testimonials are active yet">
          The website keeps showing its built-in testimonials until at least one here is set to Active.
        </Alert>
      )}

      <Card className="overflow-hidden">
        {result.items.length === 0 ? (
          <EmptyState
            icon={ChatIcon}
            title="No testimonials yet"
            description="Add patient feedback to show it on the website. Until then, the built-in testimonials are shown."
            action={
              canCreate ? (
                <ButtonLink href="/admin/testimonials/new">
                  <PlusIcon />
                  Add testimonial
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <Table minWidth={600}>
            <THead>
              <tr>
                {canPublish && <Th className="w-[88px]">Order</Th>}
                <Th>Patient</Th>
                <Th hideBelow="lg">Testimonial</Th>
                <Th hideBelow="md">Rating</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item, index) => {
                const id = item._id.toString();
                const image = asPopulatedMedia(item.image);
                return (
                  <Tr key={id}>
                    {canPublish && (
                      <Td>
                        <div className="flex items-center gap-0.5">
                          <span className="w-5 text-xs tabular-nums text-slate-400">{index + 1}</span>
                          {index > 0 ? (
                            <form action={reorderTestimonialAction.bind(null, id, "up")}>
                              <ActionButton variant="ghost" label={`Move ${item.authorName} up`}>
                                <ArrowUpIcon />
                              </ActionButton>
                            </form>
                          ) : (
                            <span className="size-8" />
                          )}
                          {index < result.items.length - 1 && (
                            <form action={reorderTestimonialAction.bind(null, id, "down")}>
                              <ActionButton variant="ghost" label={`Move ${item.authorName} down`}>
                                <ArrowDownIcon />
                              </ActionButton>
                            </form>
                          )}
                        </div>
                      </Td>
                    )}
                    <Td>
                      <Link href={`/admin/testimonials/${id}/edit`} className="group flex items-center gap-3">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin list thumbnail
                          <img
                            src={cloudinaryThumbnail(image.secureUrl, 80)}
                            alt=""
                            className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                          />
                        ) : (
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-600">
                            {initials(item.authorName)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900 group-hover:text-primary-700">
                            {item.authorName}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {[item.authorRole, item.company].filter(Boolean).join(", ") || "—"}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td hideBelow="lg">
                      <p className="line-clamp-2 max-w-[360px] text-[13px] leading-5">“{item.quote}”</p>
                    </Td>
                    <Td hideBelow="md">
                      {item.rating ? (
                        <span className="inline-flex items-center gap-1 text-[13px] font-medium tabular-nums text-slate-700">
                          <StarIcon className="size-4 text-amber-400" />
                          {item.rating}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={item.status} kind="testimonial" />
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {canPublish && item.status !== "PUBLISHED" && (
                          <form action={setTestimonialStatusAction.bind(null, id, "PUBLISHED")}>
                            <ActionButton variant="success-soft" pendingLabel="…">
                              Activate
                            </ActionButton>
                          </form>
                        )}
                        {canPublish && item.status === "PUBLISHED" && (
                          <form action={setTestimonialStatusAction.bind(null, id, "DRAFT")}>
                            <ActionButton variant="warning-soft" pendingLabel="…">
                              Deactivate
                            </ActionButton>
                          </form>
                        )}
                        <ButtonLink
                          href={`/admin/testimonials/${id}/edit`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${item.authorName}`}
                          title="Edit"
                        >
                          <PencilIcon />
                        </ButtonLink>
                        {canDelete && (
                          <ConfirmAction
                            action={deleteTestimonialAction.bind(null, id)}
                            title="Delete this testimonial?"
                            description={`The testimonial from ${item.authorName} will be permanently removed and disappear from the website. This can’t be undone.`}
                            confirmLabel="Delete testimonial"
                            triggerLabel={`Delete ${item.authorName}`}
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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
