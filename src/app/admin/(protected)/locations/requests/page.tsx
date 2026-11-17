import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listAreaInterest } from "@/services/area-interest.service";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { EmptyState } from "@/components/admin/ui/feedback";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/admin/ui/table";
import { GlobeIcon } from "@/components/admin/icons";
import { formatAdminDate } from "@/components/admin/subscription-badges";

export const metadata: Metadata = { title: "Area Requests" };

export default async function AreaRequestsPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "locations")) redirect("/admin/dashboard");
  const { searches, leads } = await listAreaInterest();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Area requests" description="Pincodes people searched for that we don't serve yet, and the parents who asked to be notified. Add a pincode under Serviceable Locations once you start there." />

      <Card className="overflow-hidden">
        <CardHeader title="Searched pincodes (not serviceable)" />
        {searches.length === 0 ? (
          <EmptyState icon={GlobeIcon} title="No searches yet" description="Pincodes we don't serve that visitors look up appear here." className="border-t border-line" />
        ) : (
          <Table minWidth={560}>
            <THead><tr><Th>Pincode</Th><Th align="right">Searches</Th><Th align="right">People waiting</Th><Th>Last searched</Th></tr></THead>
            <TBody>
              {searches.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-mono text-xs font-medium">{s.pincode}</Td>
                  <Td align="right" className="tabular-nums">{s.searches}</Td>
                  <Td align="right" className="tabular-nums">{s.leads}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(s.lastSearchedAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Notify-me requests" />
        {leads.length === 0 ? (
          <EmptyState icon={GlobeIcon} title="No requests yet" description="Details left by parents in unserved areas appear here." className="border-t border-line" />
        ) : (
          <Table minWidth={760}>
            <THead><tr><Th>Pincode</Th><Th>Name</Th><Th>Email</Th><Th>Mobile</Th><Th>Requested</Th></tr></THead>
            <TBody>
              {leads.map((l) => (
                <Tr key={l.id}>
                  <Td className="font-mono text-xs font-medium">{l.pincode}</Td>
                  <Td>{l.name || "—"}</Td>
                  <Td>{l.email || "—"}</Td>
                  <Td>{l.phone || "—"}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(l.createdAt)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
