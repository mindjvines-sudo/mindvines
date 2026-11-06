import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { formatPaise } from "@/lib/subscription-status";
import { ageInYears } from "@/validations/registration.schema";
import { getSubscriptionDetail } from "@/services/subscriber.service";
import { getTopicVersion } from "@/services/topic.service";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { buttonClasses } from "@/components/admin/ui/button";
import { EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/admin/ui/table";
import { ChartIcon, CheckCircleIcon, LayersIcon, PeopleIcon, StarIcon, UserIcon } from "@/components/admin/icons";
import {
  PaymentStatusBadge,
  SubscriptionStateBadge,
  formatAdminDate,
  formatAdminDateTime,
} from "@/components/admin/subscription-badges";
import { cancelSubscriptionAction, sendRenewalReminderAction } from "../actions";
import { SendReminderButton } from "@/components/admin/send-reminder-button";

export const metadata: Metadata = { title: "Registration" };

const TABS = [
  { id: "details", label: "Child & Parent Details" },
  { id: "preferences", label: "Creative Preferences" },
  { id: "subscription", label: "Subscription Details" },
  { id: "payments", label: "Payment History" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-[13px] font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-navy-900">{children || "—"}</dd>
    </div>
  );
}

function consentText(consent: { given?: boolean | null; at?: Date | null } | null | undefined) {
  if (!consent) return "";
  return `${consent.given ? "Yes" : "No"}${consent.at ? ` · ${formatAdminDateTime(consent.at)}` : ""}`;
}

/** A child's registration in four tabs. Older registrations, made before the full form, show what they have. */
export default async function RegistrationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "subscribers")) redirect("/admin/dashboard");
  const [{ id }, { tab: requested }] = await Promise.all([params, searchParams]);
  const detail = await getSubscriptionDetail(id);
  if (!detail) notFound();
  const tab: Tab = TABS.find((item) => item.id === requested)?.id ?? "details";

  const { subscription, registration: record, subscriber, payments, others, renewals } = detail;
  const renewalLink = subscription.reference ? `${siteConfig.url}/renew?ref=${subscription.reference}` : null;
  const snapshot = subscription.registration;
  const canCancel = can(user.role, "update", "subscribers") && (subscription.status === "ACTIVE" || subscription.status === "PENDING_PAYMENT");
  const showDays = subscription.state !== "PENDING_PAYMENT" && subscription.state !== "CANCELLED";
  const version = record?.preferences?.topicVersion ? await getTopicVersion(record.preferences.topicVersion.toString()) : null;

  const childName = record?.child?.name ?? snapshot?.childName;
  const dob = record?.child?.dob ?? snapshot?.childDob;
  const age = dob ? ageInYears(dob) : snapshot?.childAge ? Number(snapshot.childAge) : null;
  const phone = record?.parent ? `+${record.parent.phoneDial} ${record.parent.phone}` : snapshot?.phone;
  const address = record?.address
    ? [record.address.line1, record.address.line2, [record.address.city, record.address.postalCode].filter(Boolean).join(" "), record.address.country]
    : [snapshot?.address?.line, [snapshot?.address?.city, snapshot?.address?.postalCode].filter(Boolean).join(" "), snapshot?.address?.country];
  const selections = record?.preferences?.selections?.length
    ? record.preferences.selections.map((selection) => ({ name: selection.categoryName, topics: selection.topics.map((topic) => topic.title) }))
    : [
        ...(snapshot?.topics?.sketching?.length ? [{ name: "Sketching", topics: snapshot.topics.sketching }] : []),
        ...(snapshot?.topics?.writing?.length ? [{ name: "Writing", topics: snapshot.topics.writing }] : []),
      ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/subscribers", label: "All registrations" }}
        title={childName || snapshot?.name || "Registration"}
        description={[
          subscription.reference && `Registration ${subscription.reference}`,
          subscription.renewal && "Renewal",
          snapshot?.name && `Parent: ${snapshot.name}`,
        ].filter(Boolean).join(" · ")}
        meta={<SubscriptionStateBadge state={subscription.state} />}
        actions={
          <div className="flex flex-wrap items-start justify-end gap-3">
            {detail.renewalDue && can(user.role, "update", "subscribers") && snapshot?.email && (
              <SendReminderButton
                size="md"
                action={sendRenewalReminderAction.bind(null, id)}
                email={snapshot.email}
                lastSent={subscription.renewalReminderSentAt ? formatAdminDate(subscription.renewalReminderSentAt) : null}
              />
            )}
            {canCancel ? (
            <ConfirmAction
              action={cancelSubscriptionAction.bind(null, id)}
              title="Cancel this subscription?"
              description="It stops being active straight away. The payment record stays as it is. Money is not refunded from here; do that in the Razorpay dashboard."
              confirmLabel="Cancel subscription"
              trigger="Cancel subscription"
              size="md"
            />
            ) : null}
          </div>
        }
      />

      <nav aria-label="Registration sections" className="flex flex-wrap gap-1 rounded-2xl border border-line bg-white p-1">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.id === "details" ? `/admin/subscribers/${id}` : `/admin/subscribers/${id}?tab=${item.id}`}
            aria-current={tab === item.id ? "page" : undefined}
            scroll={false}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              tab === item.id ? "bg-primary-50 text-primary-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "details" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader icon={StarIcon} title="Child" />
            <dl className="divide-y divide-line px-5 pb-3">
              <Detail label="Name">{childName}</Detail>
              <Detail label="Date of birth">
                {dob ? `${formatAdminDate(new Date(`${dob}T00:00:00+05:30`))}${age !== null ? ` (${age} years)` : ""}` : age !== null ? `${age} years` : ""}
              </Detail>
              <Detail label="School">{record?.child?.school ?? snapshot?.school}</Detail>
              <Detail label="Programme">{record?.programmeName ?? subscription.planSnapshot?.programme}</Detail>
            </dl>
          </Card>
          <Card>
            <CardHeader icon={UserIcon} title="Parent" />
            <dl className="divide-y divide-line px-5 pb-3">
              <Detail label="Name">{record?.parent?.name ?? snapshot?.name}</Detail>
              <Detail label="Email">{record?.parent?.email ?? snapshot?.email}</Detail>
              <Detail label="Mobile (WhatsApp)">{phone}</Detail>
              <Detail label="Customer since">{subscriber ? formatAdminDateTime(subscriber.createdAt) : "Not yet: payment is not verified"}</Detail>
            </dl>
          </Card>
          <Card>
            <CardHeader icon={PeopleIcon} title="Address" />
            <dl className="divide-y divide-line px-5 pb-3">
              <Detail label="Address">
                {address.filter(Boolean).length > 0 ? <span className="whitespace-pre-line">{address.filter(Boolean).join("\n")}</span> : ""}
              </Detail>
            </dl>
          </Card>
          <Card>
            <CardHeader icon={CheckCircleIcon} title="Permissions" description="Each recorded separately, with when it was given or withdrawn" />
            <dl className="divide-y divide-line px-5 pb-3">
              <Detail label="Terms, privacy & participation">
                {record?.consents
                  ? consentText(record.consents.terms)
                  : snapshot?.consents?.terms !== undefined && snapshot?.consents?.terms !== null
                    ? `${snapshot.consents.terms ? "Yes" : "No"}${snapshot.consents.termsAcceptedAt ? ` · ${formatAdminDateTime(snapshot.consents.termsAcceptedAt)}` : ""}`
                    : ""}
              </Detail>
              <Detail label="Feature work online">
                {record?.consents ? consentText(record.consents.featureWork) : snapshot?.consents?.featureWork === undefined || snapshot?.consents?.featureWork === null ? "" : snapshot.consents.featureWork ? "Yes" : "No"}
              </Detail>
              <Detail label="WhatsApp news & offers">
                {record?.consents ? consentText(record.consents.whatsappUpdates) : snapshot?.consents?.whatsappUpdates === undefined || snapshot?.consents?.whatsappUpdates === null ? "" : snapshot.consents.whatsappUpdates ? "Yes" : "No"}
              </Detail>
            </dl>
          </Card>
        </div>
      )}

      {tab === "preferences" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader icon={StarIcon} title="Nickname" description="Written on each entry instead of the child's real name" />
            <p className="px-5 pb-5 text-lg font-medium text-navy-900">{record?.preferences?.nickname ?? snapshot?.nickname ?? "—"}</p>
          </Card>
          {selections.length === 0 ? (
            <Card><EmptyState icon={LayersIcon} title="No topics chosen" description="This registration was made before topic choices were part of the form, or has not reached page 2." /></Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {selections.map((selection) => (
                <Card key={selection.name}>
                  <CardHeader
                    icon={LayersIcon}
                    title={selection.name}
                    description={`${selection.topics.length} chosen${version ? ` from the “${version.name}” topic set` : ""}`}
                  />
                  <ol className="list-decimal space-y-1 px-5 pb-5 pl-10 text-sm text-navy-900">
                    {selection.topics.map((topic) => <li key={topic}>{topic}</li>)}
                  </ol>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "subscription" && (
        <>
          <Card>
            <CardHeader icon={StarIcon} title="Subscription" />
            <dl className="divide-y divide-line px-5 pb-3">
              <Detail label="Status"><SubscriptionStateBadge state={subscription.state} /></Detail>
              <Detail label="Programme">{subscription.planSnapshot?.programme}</Detail>
              <Detail label="Plan">{subscription.planSnapshot?.name}</Detail>
              <Detail label="Age group">{subscription.planSnapshot ? `Ages ${subscription.planSnapshot.ageGroup}` : ""}</Detail>
              <Detail label="Duration">
                {subscription.planSnapshot ? `${subscription.planSnapshot.durationMonths} ${subscription.planSnapshot.durationMonths === 1 ? "month" : "months"}` : ""}
              </Detail>
              <Detail label="Price">{subscription.planSnapshot ? `₹${subscription.planSnapshot.price.toLocaleString("en-IN")} + GST` : ""}</Detail>
              <Detail label="Starts">{formatAdminDate(subscription.startDate)}</Detail>
              <Detail label="Expires">{formatAdminDateTime(subscription.expiryDate)}</Detail>
              <Detail label="Days remaining">{showDays ? String(subscription.daysRemaining) : ""}</Detail>
              <Detail label="Registered">{formatAdminDateTime(subscription.createdAt)}</Detail>
              {subscription.status === "CANCELLED" && (
                <Detail label="Cancelled">{`${formatAdminDateTime(subscription.cancelledAt)}${subscription.cancelReason ? `. ${subscription.cancelReason}` : ""}`}</Detail>
              )}
            </dl>
          </Card>
          {renewals.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader
                icon={StarIcon}
                title="Subscriptions for this registration"
                description="The first subscription and every renewal, oldest first. A renewal paid early starts when the one before it ends."
              />
              <Table minWidth={720}>
                <THead><tr><Th>Type</Th><Th>Programme / plan</Th><Th>Starts</Th><Th>Expires</Th><Th>Payment</Th><Th>Status</Th></tr></THead>
                <TBody>
                  {renewals.map((item) => {
                    const current = item._id.equals(subscription._id);
                    return (
                      <Tr key={item._id.toString()} className={current ? "bg-primary-50/40" : undefined}>
                        <Td>
                          <Link href={`/admin/subscribers/${item._id}?tab=subscription`} className="font-medium text-navy-900 hover:text-primary-700">
                            {item.renewal ? "Renewal" : "First subscription"}
                          </Link>
                          {current && <span className="block text-xs text-slate-400">This one</span>}
                        </Td>
                        <Td>
                          <span className="block text-slate-700">{item.planSnapshot?.programme}</span>
                          <span className="block text-xs text-slate-400">{item.planSnapshot?.name} · {item.planSnapshot?.durationMonths} mo</span>
                        </Td>
                        <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(item.startDate)}</Td>
                        <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(item.expiryDate)}</Td>
                        <Td>{item.payment ? <PaymentStatusBadge status={item.payment.status} /> : "—"}</Td>
                        <Td><SubscriptionStateBadge state={item.state} /></Td>
                      </Tr>
                    );
                  })}
                </TBody>
              </Table>
            </Card>
          )}
          {renewalLink && (
            <Card>
              <CardHeader
                icon={StarIcon}
                title="Renewal link"
                description="Send this to the parent. They confirm with the email or mobile number they registered with, choose any plan and pay. The registration number stays the same."
              />
              <div className="flex flex-col gap-2 px-5 pb-5 sm:flex-row">
                <input readOnly value={renewalLink} aria-label="Renewal link" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-slate-50 px-3 font-mono text-sm text-slate-700" />
                <a href={renewalLink} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary" })}>Open</a>
              </div>
            </Card>
          )}
          {others.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader icon={StarIcon} title="Other registrations by this parent" description="This parent's other children" />
              <Table minWidth={0}>
                <THead><tr><Th>Child</Th><Th>Plan</Th><Th hideBelow="sm">Starts</Th><Th hideBelow="sm">Expires</Th><Th>Status</Th></tr></THead>
                <TBody>
                  {others.map((item) => (
                    <Tr key={item._id.toString()}>
                      <Td>
                        <Link href={`/admin/subscribers/${item._id}`} className="font-medium text-navy-900 hover:text-primary-700">
                          {item.registration?.childName || item.reference || "Registration"}
                        </Link>
                      </Td>
                      <Td>{item.planSnapshot?.name}</Td>
                      <Td hideBelow="sm" className="whitespace-nowrap tabular-nums">{formatAdminDate(item.startDate)}</Td>
                      <Td hideBelow="sm" className="whitespace-nowrap tabular-nums">{formatAdminDate(item.expiryDate)}</Td>
                      <Td><SubscriptionStateBadge state={item.state} /></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </Card>
          )}
        </>
      )}

      {tab === "payments" && (
        <Card className="overflow-hidden">
          <CardHeader icon={ChartIcon} title="Payments" description="Every payment attempt for this registration" />
          {payments.length === 0 ? (
            <EmptyState icon={ChartIcon} title="No payment attempts" className="border-t border-line" />
          ) : (
            <Table minWidth={760}>
              <THead>
                <tr>
                  <Th>Date</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                  <Th>Verification</Th>
                  <Th>Razorpay order / payment ID</Th>
                </tr>
              </THead>
              <TBody>
                {payments.map((payment) => (
                  <Tr key={payment._id.toString()}>
                    <Td className="whitespace-nowrap tabular-nums">{formatAdminDateTime(payment.paidAt ?? payment.createdAt)}</Td>
                    <Td align="right" className="whitespace-nowrap tabular-nums">
                      {formatPaise(payment.amount)}
                      <span className="block text-xs text-slate-400">{formatPaise(payment.baseAmount)} + {formatPaise(payment.taxAmount)} GST · {payment.currency}</span>
                    </Td>
                    <Td>
                      <PaymentStatusBadge status={payment.status} />
                      {payment.failureReason && <span className="mt-1 block max-w-[240px] text-xs text-red-600">{payment.failureReason}</span>}
                    </Td>
                    <Td className="text-xs text-slate-600">
                      {payment.verification?.signatureVerified
                        ? `Verified via ${payment.verification.verifiedVia === "WEBHOOK" ? "webhook" : "checkout"}${payment.verification.verifiedAt ? ` · ${formatAdminDateTime(payment.verification.verifiedAt)}` : ""}`
                        : "Not verified"}
                      {payment.method && <span className="block text-slate-400">{payment.method}</span>}
                    </Td>
                    <Td className="font-mono text-xs text-slate-500">
                      <span className="block">{payment.razorpayOrderId}</span>
                      <span className="block">{payment.razorpayPaymentId ?? "—"}</span>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
