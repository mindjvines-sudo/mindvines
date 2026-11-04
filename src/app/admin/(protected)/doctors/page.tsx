import type { Metadata } from "next";
import Link from "next/link";
import { listDoctorsAdmin } from "@/services/doctor.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { asPopulatedMedia } from "@/types/media";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import { deleteDoctorAction, reorderDoctorAction, setDoctorStatusAction } from "./actions";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { Alert, EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ActionButton, ConfirmAction } from "@/components/admin/ui/confirm-action";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, StethoscopeIcon, TrashIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Doctors" };

export default async function DoctorsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const [user, result] = await Promise.all([getCurrentUser(), listDoctorsAdmin({ page: params.page, limit: 50 })]);

  const canCreate = can(user.role, "create", "team");
  const canDelete = can(user.role, "delete", "team");
  const canPublish = can(user.role, "publish", "team");
  const activeCount = result.items.filter((item) => item.status === "PUBLISHED").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Doctors"
        description="The clinical team shown on the Home and About pages and offered in the booking forms, in the order below."
        actions={
          canCreate && (
            <ButtonLink href="/admin/doctors/new">
              <PlusIcon />
              Add doctor
            </ButtonLink>
          )
        }
      />

      {result.items.length > 0 && activeCount === 0 && (
        <Alert tone="info" title="No doctors are active yet">
          The website keeps showing its built-in doctors until at least one here is set to Active.
        </Alert>
      )}

      <Card className="overflow-hidden">
        {result.items.length === 0 ? (
          <EmptyState
            icon={StethoscopeIcon}
            title="No doctors yet"
            description="Add your clinical team to show them on the website. Until then, the built-in doctors are shown."
            action={
              canCreate ? (
                <ButtonLink href="/admin/doctors/new">
                  <PlusIcon />
                  Add doctor
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <Table minWidth={600}>
            <THead>
              <tr>
                {canPublish && <Th className="w-[88px]">Order</Th>}
                <Th>Doctor</Th>
                <Th hideBelow="lg">Qualifications</Th>
                <Th hideBelow="md">Experience</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item, index) => {
                const id = item._id.toString();
                const photo = asPopulatedMedia(item.photo);
                return (
                  <Tr key={id}>
                    {canPublish && (
                      <Td>
                        <div className="flex items-center gap-0.5">
                          <span className="w-5 text-xs tabular-nums text-slate-400">{index + 1}</span>
                          {index > 0 ? (
                            <form action={reorderDoctorAction.bind(null, id, "up")}>
                              <ActionButton variant="ghost" label={`Move ${item.name} up`}>
                                <ArrowUpIcon />
                              </ActionButton>
                            </form>
                          ) : (
                            <span className="size-8" />
                          )}
                          {index < result.items.length - 1 && (
                            <form action={reorderDoctorAction.bind(null, id, "down")}>
                              <ActionButton variant="ghost" label={`Move ${item.name} down`}>
                                <ArrowDownIcon />
                              </ActionButton>
                            </form>
                          )}
                        </div>
                      </Td>
                    )}
                    <Td>
                      <Link href={`/admin/doctors/${id}/edit`} className="group flex items-center gap-3">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- admin list thumbnail
                          <img
                            src={cloudinaryThumbnail(photo.secureUrl, 80)}
                            alt=""
                            className="size-9 shrink-0 rounded-full object-cover ring-2 ring-white"
                          />
                        ) : (
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-600">
                            {initials(item.name)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900 group-hover:text-primary-700">
                            {item.name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">{item.designation}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td hideBelow="lg">
                      <span className="text-[13px] text-slate-700">{item.qualifications || "—"}</span>
                    </Td>
                    <Td hideBelow="md">
                      {item.experienceYears != null ? (
                        <span className="text-[13px] tabular-nums text-slate-700">
                          {item.experienceYears} {item.experienceYears === 1 ? "year" : "years"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={item.status} kind="doctor" />
                    </Td>
                    <Td align="right">
                      <RowActions>
                        {canPublish && item.status !== "PUBLISHED" && (
                          <form action={setDoctorStatusAction.bind(null, id, "PUBLISHED")}>
                            <ActionButton variant="success-soft" pendingLabel="…">
                              Activate
                            </ActionButton>
                          </form>
                        )}
                        {canPublish && item.status === "PUBLISHED" && (
                          <form action={setDoctorStatusAction.bind(null, id, "DRAFT")}>
                            <ActionButton variant="warning-soft" pendingLabel="…">
                              Deactivate
                            </ActionButton>
                          </form>
                        )}
                        <ButtonLink
                          href={`/admin/doctors/${id}/edit`}
                          variant="ghost"
                          size="sm"
                          aria-label={`Edit ${item.name}`}
                          title="Edit"
                        >
                          <PencilIcon />
                        </ButtonLink>
                        {canDelete && (
                          <ConfirmAction
                            action={deleteDoctorAction.bind(null, id)}
                            title="Delete this doctor?"
                            description={`${item.name} will be permanently removed and disappear from the website and the booking forms. This can’t be undone.`}
                            confirmLabel="Delete doctor"
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

function initials(name: string): string {
  const parts = name
    .replace(/^dr\.?\s+/i, "")
    .trim()
    .split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
