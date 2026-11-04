import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getPageStats } from "@/services/page.service";
import { getBlogStats, listRecentBlogPosts } from "@/services/blog.service";
import { getTestimonialStats } from "@/services/testimonial.service";
import {
  getEnquiryStats,
  getEnquiryInsights,
  listRecentEnquiries,
  getEnquiryDailyCounts,
} from "@/services/enquiry.service";
import { getMediaStats } from "@/services/media.service";
import { listRecentAuditLogs } from "@/services/audit.service";
import { StatTile } from "@/components/admin/stat-tile";
import { EnquiriesChart } from "@/components/admin/enquiries-chart";
import { BarList, DonutChart } from "@/components/admin/charts";
import { activityTone, describeActivity } from "@/components/admin/activity";
import { Card, CardHeader, CardLink } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ButtonLink } from "@/components/admin/ui/button";
import { StatusBadge } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/admin/ui/table";
import { asPopulatedMedia } from "@/types/media";
import {
  DocumentIcon,
  ChatIcon,
  InboxIcon,
  ChartIcon,
  ImageIcon,
  CalendarIcon,
  StethoscopeIcon,
  HeartPulseIcon,
  CheckCircleIcon,
  PlusIcon,
  UploadIcon,
  GearIcon,
  ClockIcon,
  ChevronRightIcon,
  LayersIcon,
} from "@/components/admin/icons";

export const metadata: Metadata = { title: "Dashboard" };

const RANGES = [7, 14, 30] as const;

/** Status colours shared by the donut, matching the status badges. */
const STATUS_SEGMENTS = [
  { key: "NEW", label: "New", color: "#0ea5e9" },
  { key: "CONTACTED", label: "Contacted", color: "#7070b1" },
  { key: "IN_PROGRESS", label: "In progress", color: "#f59e0b" },
  { key: "RESOLVED", label: "Resolved", color: "#10b981" },
  { key: "ARCHIVED", label: "Archived", color: "#94a3b8" },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: rangeParam } = await searchParams;
  const range = RANGES.find((r) => String(r) === rangeParam) ?? 7;

  const user = await getCurrentUser();
  const [
    pageStats,
    blogStats,
    testimonialStats,
    enquiryStats,
    insights,
    mediaStats,
    dailyEnquiries,
    recentBlogPosts,
    recentEnquiries,
    recentActivity,
  ] = await Promise.all([
    getPageStats(),
    getBlogStats(),
    getTestimonialStats(),
    getEnquiryStats(),
    getEnquiryInsights(),
    getMediaStats(),
    getEnquiryDailyCounts(range),
    listRecentBlogPosts(4),
    listRecentEnquiries(6),
    listRecentAuditLogs(8),
  ]);

  const canReadEnquiries = can(user.role, "read", "enquiries");
  const resolved = insights.byStatus.RESOLVED ?? 0;
  const resolutionRate = enquiryStats.total > 0 ? Math.round((resolved / enquiryStats.total) * 100) : 0;
  const rangeTotal = dailyEnquiries.reduce((sum, d) => sum + d.count, 0);

  const quickActions = [
    can(user.role, "create", "blog") && { href: "/admin/blog/new", icon: DocumentIcon, label: "Write a blog post" },
    can(user.role, "create", "testimonials") && {
      href: "/admin/testimonials/new",
      icon: ChatIcon,
      label: "Add a testimonial",
    },
    canReadEnquiries && { href: "/admin/enquiries?status=NEW", icon: InboxIcon, label: "Reply to new enquiries" },
    can(user.role, "create", "media") && { href: "/admin/media", icon: UploadIcon, label: "Upload media" },
    can(user.role, "update", "settings") && { href: "/admin/settings", icon: GearIcon, label: "Update clinic details" },
  ].filter(Boolean) as { href: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string }[];

  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here’s how patient enquiries and your website are doing."
        actions={
          <>
            {canReadEnquiries && (
              <ButtonLink href="/admin/enquiries" variant="secondary">
                <InboxIcon />
                View enquiries
              </ButtonLink>
            )}
            {can(user.role, "create", "blog") && (
              <ButtonLink href="/admin/blog/new">
                <PlusIcon />
                New blog post
              </ButtonLink>
            )}
          </>
        }
      />

      {/* Patient care metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={InboxIcon}
          color="blue"
          label="Awaiting reply"
          value={enquiryStats.new}
          note={`${enquiryStats.newThisMonth} new enquiries this month`}
          href={canReadEnquiries ? "/admin/enquiries?status=NEW" : undefined}
        />
        <StatTile
          icon={StethoscopeIcon}
          color="teal"
          label="Appointment requests this month"
          value={insights.appointmentsThisMonth}
          compare={{
            current: insights.appointmentsThisMonth,
            previous: insights.appointmentsLastMonth,
            period: "last month",
          }}
        />
        <StatTile
          icon={CalendarIcon}
          color="violet"
          label="Upcoming requested dates"
          value={insights.upcomingAppointments}
          note="Open requests with a preferred date from today"
        />
        <StatTile
          icon={CheckCircleIcon}
          color="green"
          label="Resolution rate"
          value={`${resolutionRate}%`}
          note={`${resolved} of ${enquiryStats.total} enquiries resolved`}
        />
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={ChartIcon}
            title="Enquiries over time"
            description={`${rangeTotal} received in the last ${range} days · ${insights.totalThisMonth} this month, ${insights.totalLastMonth} last month`}
            action={
              <nav aria-label="Chart range" className="flex shrink-0 rounded-lg bg-slate-100/80 p-0.5">
                {RANGES.map((r) => (
                  <Link
                    key={r}
                    href={r === 7 ? "/admin/dashboard" : `/admin/dashboard?range=${r}`}
                    scroll={false}
                    aria-current={r === range ? "true" : undefined}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      r === range ? "bg-white text-navy-900 shadow-card" : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    {r}d
                  </Link>
                ))}
              </nav>
            }
          />
          <div className="px-3 pb-4 pt-4 sm:px-5">
            <EnquiriesChart data={dailyEnquiries} label={`Enquiries per day, last ${range} days`} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={HeartPulseIcon} title="Enquiry status" description="Where every enquiry stands today" />
          <div className="p-5">
            <DonutChart
              totalLabel="Enquiries"
              segments={STATUS_SEGMENTS.map((s) => ({
                label: s.label,
                color: s.color,
                value: insights.byStatus[s.key] ?? 0,
              }))}
              emptyLabel="No enquiries received yet."
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader
            icon={InboxIcon}
            title="Latest enquiries"
            description="Newest messages and appointment requests"
            action={canReadEnquiries ? <CardLink href="/admin/enquiries">View all</CardLink> : undefined}
            className="pb-4"
          />
          {recentEnquiries.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="No enquiries yet"
              description="Messages sent from the website’s Contact page will appear here."
              className="border-t border-line"
            />
          ) : (
            <Table minWidth={440}>
              <THead>
                <tr>
                  <Th>Patient</Th>
                  <Th hideBelow="md">Request</Th>
                  <Th hideBelow="sm">Preferred date</Th>
                  <Th>Status</Th>
                </tr>
              </THead>
              <TBody>
                {recentEnquiries.map((enquiry) => (
                  <Tr key={enquiry._id.toString()}>
                    <Td>
                      <Link
                        href={`/admin/enquiries/${enquiry._id}`}
                        className="flex items-center gap-3 rounded-lg focus-visible:outline-offset-4"
                      >
                        <Avatar name={enquiry.name} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900 hover:text-primary-700">
                            {enquiry.name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {new Date(enquiry.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {enquiry.email}
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td hideBelow="md">
                      <span className="block max-w-[220px] truncate">
                        {enquiry.department || enquiry.subject || "General enquiry"}
                      </span>
                      {enquiry.doctor && <span className="block truncate text-xs text-slate-400">{enquiry.doctor}</span>}
                    </Td>
                    <Td hideBelow="sm" className="tabular-nums">
                      {enquiry.preferredDate
                        ? new Date(`${enquiry.preferredDate}T00:00:00`).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </Td>
                    <Td>
                      <StatusBadge status={enquiry.status} kind="enquiry" />
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={StethoscopeIcon}
            title="Requests by service"
            description="Appointment requests per physiotherapy service"
          />
          <div className="p-5">
            {insights.byDepartment.length === 0 ? (
              <EmptyState
                icon={StethoscopeIcon}
                title="No appointment requests yet"
                description="Requests that pick a service on the Contact page are counted here."
                className="py-8"
              />
            ) : (
              <BarList items={insights.byDepartment.slice(0, 6).map((d) => ({ label: d.label, value: d.count }))} />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader icon={LayersIcon} title="Website content" description="What’s live on mindvines.in" />
          <dl className="mx-5 mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
            <ContentStat label="Published posts" value={blogStats.published} sub={`${blogStats.draft} drafts`} />
            <ContentStat
              label="Active testimonials"
              value={testimonialStats.active}
              sub={`of ${testimonialStats.total}`}
            />
            <ContentStat label="Media files" value={mediaStats.total} sub={`+${mediaStats.totalThisMonth} this month`} />
            <ContentStat label="Published pages" value={pageStats.published} sub={`${pageStats.draft} drafts`} />
          </dl>
          {quickActions.length > 0 && (
            <div className="p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">Quick actions</p>
              <ul className="flex flex-col gap-1">
                {quickActions.map((action) => (
                  <li key={action.href}>
                    <Link
                      href={action.href}
                      className="group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-primary-50 group-hover:text-primary-600">
                        <action.icon className="size-4" />
                      </span>
                      <span className="flex-1">{action.label}</span>
                      <ChevronRightIcon className="size-4 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={DocumentIcon}
            title="Recent blog posts"
            action={<CardLink href="/admin/blog">View all</CardLink>}
          />
          {recentBlogPosts.length === 0 ? (
            <EmptyState icon={DocumentIcon} title="No posts yet" description="Write your first article for patients." />
          ) : (
            <ul className="flex flex-col gap-1 p-3">
              {recentBlogPosts.map((post) => {
                const image = asPopulatedMedia(post.featuredImage);
                return (
                  <li key={post._id.toString()}>
                    <Link
                      href={`/admin/blog/${post._id}/edit`}
                      className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"
                    >
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small admin list thumbnail
                        <img src={image.secureUrl} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <ImageIcon className="size-5 text-slate-400" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-navy-900">{post.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Updated {new Date(post.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <StatusBadge status={post.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <CardHeader icon={ClockIcon} title="Recent activity" description="Changes made by your team" />
          {recentActivity.length === 0 ? (
            <EmptyState icon={ClockIcon} title="No activity yet" />
          ) : (
            <ol className="relative mx-5 my-5 flex flex-col gap-4 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-line">
              {recentActivity.map((entry) => {
                const actor = (entry.userId as { name?: string } | null)?.name;
                return (
                  <li key={entry._id.toString()} className="relative flex gap-3 pl-5">
                    <span
                      aria-hidden
                      className={cn("absolute left-0 top-1.5 size-[7px] rounded-full ring-4 ring-white", activityTone(entry.action))}
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700">
                        {actor && <span className="font-medium text-navy-900">{actor} · </span>}
                        {describeActivity(entry)}
                      </p>
                      <p className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function ContentStat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums text-navy-900">{value}</span>
        <span className="truncate text-xs text-slate-400">{sub}</span>
      </dd>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const letters = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">
      {letters}
    </span>
  );
}
