import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { LocationForm } from "@/components/admin/locations/location-form";
import { CsvImport } from "@/components/admin/locations/csv-import";

export const metadata: Metadata = { title: "Add Pincode" };

export default async function NewLocationPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "locations")) redirect("/admin/dashboard");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/admin/locations", label: "Serviceable locations" }} title="Add pincode" description="Enter a pincode to allow registrations from it. Add several at once with a CSV." />
      <Card><LocationForm /></Card>
      <Card>
        <CardHeader title="Import from CSV" description="Many pincodes in one go." />
        <CsvImport />
      </Card>
    </div>
  );
}
