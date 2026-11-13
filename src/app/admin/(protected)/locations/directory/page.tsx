import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { locationSummary, registrationDistribution } from "@/services/location.service";
import { BarList } from "@/components/admin/charts";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { EmptyState } from "@/components/admin/ui/feedback";
import { StatTile } from "@/components/admin/stat-tile";
import { CheckCircleIcon, GlobeIcon, PeopleIcon, XIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Location Directory" };

export default async function LocationDirectoryPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "locations")) redirect("/admin/dashboard");
  const [summary, state, district, city, pincode] = await Promise.all([
    locationSummary(),
    registrationDistribution("state"),
    registrationDistribution("district"),
    registrationDistribution("city"),
    registrationDistribution("pincode"),
  ]);
  const charts = [
    { title: "By state", items: state },
    { title: "By district", items: district },
    { title: "By city", items: city },
    { title: "By pincode", items: pincode },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Location directory" description="Where registered children are, by state, district, city and pincode (top 10 each)." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={GlobeIcon} label="Serviceable pincodes" value={summary.total} color="teal" href="/admin/locations" />
        <StatTile icon={CheckCircleIcon} label="Active locations" value={summary.active} color="green" href="/admin/locations?status=active" />
        <StatTile icon={XIcon} label="Inactive locations" value={summary.inactive} color="slate" href="/admin/locations?status=inactive" />
        <StatTile icon={PeopleIcon} label="Registrations from listed pincodes" value={summary.registrationsFromListed} color="violet" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {charts.map((chart) => (
          <Card key={chart.title}>
            <CardHeader title={chart.title} />
            <div className="px-5 pb-5 sm:px-6">
              {chart.items.length === 0 ? <EmptyState icon={GlobeIcon} title="No registrations yet" description="Completed registrations appear here." /> : <BarList items={chart.items} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
