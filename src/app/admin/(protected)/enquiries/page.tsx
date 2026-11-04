import type { Metadata } from "next";
import Link from "next/link";
import { countEnquiriesByStatus, listEnquiriesAdmin } from "@/services/enquiry.service";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/lib/constants";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge, statusLabel } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { FilterTabs, Pagination, SearchForm, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ChevronRightIcon, InboxIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Enquiries" };

function parseStatus(value: string | undefined): EnquiryStatus | undefined {
  return ENQUIRY_STATUSES.includes(value as EnquiryStatus) ? (value as EnquiryStatus) : undefined;
}

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default async function EnquiriesListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const search = params.search?.trim() || undefined;
  const [result, counts] = await Promise.all([
    listEnquiriesAdmin({ page: params.page, status, search }),
    countEnquiriesByStatus(),
  ]);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Enquiries"
        description="Messages and appointment requests sent from the website’s Contact page."
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <FilterTabs
            label="Filter by status"
            tabs={[
              { label: "All", href: hrefWith("/admin/enquiries", { search }), active: !status, count: total },
              ...ENQUIRY_STATUSES.map((s) => ({
                label: statusLabel(s, "enquiry"),
                href: hrefWith("/admin/enquiries", { status: s, search }),
                active: status === s,
                count: counts[s] ?? 0,
              })),
            ]}
          />
          <SearchForm placeholder="Search name or email" defaultValue={search} keep={{ status }} />
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title={search || status ? "No matching enquiries" : "No enquiries yet"}
            description={
              search || status
                ? "Try a different search or status filter."
                : "Messages sent from the website’s Contact page will appear here."
            }
            action={
              search || status ? (
                <ButtonLink href="/admin/enquiries" variant="secondary">
                  Clear filters
                </ButtonLink>
              ) : undefined
            }
            className="border-t border-line"
          />
        ) : (
          <Table minWidth={0}>
            <THead>
              <tr>
                <Th>Patient</Th>
                <Th hideBelow="sm">Request</Th>
                <Th hideBelow="lg">Preferred date</Th>
                <Th>Status</Th>
                <Th hideBelow="md">Received</Th>
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item) => (
                <Tr key={item._id.toString()} className={item.status === "NEW" ? "bg-sky-50/30" : undefined}>
                  <Td>
                    <Link href={`/admin/enquiries/${item._id}`} className="group flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">
                        {initials(item.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-navy-900 group-hover:text-primary-700">
                          {item.name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{item.email}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td hideBelow="sm">
                    <span className="block max-w-[260px] truncate text-slate-700">
                      {item.department || item.subject || "General enquiry"}
                    </span>
                    <span className="block max-w-[260px] truncate text-xs text-slate-400">
                      {item.doctor || item.phone || "—"}
                    </span>
                  </Td>
                  <Td hideBelow="lg" className="tabular-nums">
                    {item.preferredDate ? formatDate(`${item.preferredDate}T00:00:00`) : "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={item.status} kind="enquiry" />
                  </Td>
                  <Td hideBelow="md" className="whitespace-nowrap tabular-nums">
                    {formatDate(item.createdAt)}
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <ButtonLink
                        href={`/admin/enquiries/${item._id}`}
                        variant="ghost"
                        size="sm"
                        aria-label={`Open enquiry from ${item.name}`}
                      >
                        Open
                        <ChevronRightIcon />
                      </ButtonLink>
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}

        <Pagination
          path="/admin/enquiries"
          page={result.page}
          pages={result.pages}
          total={result.total}
          limit={result.limit}
          params={{ status, search }}
          noun="enquiries"
        />
      </Card>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
