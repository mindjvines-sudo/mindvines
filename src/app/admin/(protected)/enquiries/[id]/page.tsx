import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEnquiryById } from "@/services/enquiry.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { ENQUIRY_STATUSES } from "@/lib/constants";
import { setEnquiryStatusAction, deleteEnquiryAction } from "../actions";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge, statusLabel } from "@/components/admin/ui/badge";
import { ActionButton, ConfirmAction } from "@/components/admin/ui/confirm-action";
import { buttonClasses } from "@/components/admin/ui/button";
import {
  CheckIcon,
  ClockIcon,
  InboxIcon,
  MailIcon,
  PhoneIcon,
  TrashIcon,
  UserIcon,
} from "@/components/admin/icons";

export const metadata: Metadata = { title: "Enquiry Detail" };

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, enquiry] = await Promise.all([getCurrentUser(), getEnquiryById(id)]);

  if (!enquiry) {
    notFound();
  }

  const canUpdate = can(user.role, "update", "enquiries");
  const canDelete = can(user.role, "delete", "enquiries");
  const received = new Date(enquiry.createdAt);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/enquiries", label: "All enquiries" }}
        title={enquiry.subject || `Enquiry from ${enquiry.name}`}
        meta={<StatusBadge status={enquiry.status} kind="enquiry" />}
        description={`Received ${received.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`}
        actions={
          <>
            <a href={`mailto:${enquiry.email}`} className={buttonClasses({ variant: "primary" })}>
              <MailIcon />
              Reply by email
            </a>
            {enquiry.phone && (
              <a href={`tel:${enquiry.phone}`} className={buttonClasses({ variant: "secondary" })}>
                <PhoneIcon />
                Call
              </a>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader icon={InboxIcon} title="Message" />
            {enquiry.message ? (
              <p className="whitespace-pre-wrap px-5 pb-6 pt-4 text-[15px] leading-7 text-slate-700">{enquiry.message}</p>
            ) : (
              <p className="px-5 pb-6 pt-4 text-[15px] leading-7 text-slate-400">No message was left.</p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader icon={UserIcon} title="Contact details" />
            <dl className="flex flex-col gap-4 px-5 pb-5 pt-4 text-sm">
              <ContactRow label="Name" value={enquiry.name} />
              <ContactRow
                label="Email"
                value={
                  <a href={`mailto:${enquiry.email}`} className="break-all font-medium text-primary-700 hover:underline">
                    {enquiry.email}
                  </a>
                }
              />
              <ContactRow
                label="Phone"
                value={
                  enquiry.phone ? (
                    <a href={`tel:${enquiry.phone}`} className="font-medium text-primary-700 hover:underline">
                      {enquiry.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )
                }
              />
              {enquiry.childAge && <ContactRow label="Child's age" value={enquiry.childAge} />}
              <ContactRow
                label="Received"
                value={received.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              />
            </dl>
          </Card>

          {canUpdate && (
            <Card>
              <CardHeader icon={ClockIcon} title="Update status" description="Track where this enquiry stands" />
              <div className="flex flex-col gap-1.5 p-5">
                {ENQUIRY_STATUSES.map((status) => {
                  const current = status === enquiry.status;
                  return current ? (
                    <div
                      key={status}
                      className="flex h-10 items-center justify-between rounded-xl border border-primary-200 bg-primary-50 px-3.5 text-sm font-medium text-primary-700"
                    >
                      {statusLabel(status, "enquiry")}
                      <CheckIcon className="size-4" />
                    </div>
                  ) : (
                    <form key={status} action={setEnquiryStatusAction.bind(null, id, status)}>
                      <ActionButton variant="secondary" size="md" pendingLabel="Updating…" className="w-full justify-start!">
                        Mark as {statusLabel(status, "enquiry").toLowerCase()}
                      </ActionButton>
                    </form>
                  );
                })}
              </div>
              {canDelete && (
                <div className="border-t border-line px-5 py-4">
                  <ConfirmAction
                    action={deleteEnquiryAction.bind(null, id)}
                    title="Delete this enquiry?"
                    description={`The enquiry from ${enquiry.name} will be permanently removed. This can’t be undone.`}
                    confirmLabel="Delete enquiry"
                    trigger={
                      <>
                        <TrashIcon />
                        Delete enquiry
                      </>
                    }
                  />
                </div>
              )}
            </Card>
          )}

          {!canUpdate && canDelete && (
            <ConfirmAction
              action={deleteEnquiryAction.bind(null, id)}
              title="Delete this enquiry?"
              description={`The enquiry from ${enquiry.name} will be permanently removed. This can’t be undone.`}
              confirmLabel="Delete enquiry"
              trigger={
                <>
                  <TrashIcon />
                  Delete enquiry
                </>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ContactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
