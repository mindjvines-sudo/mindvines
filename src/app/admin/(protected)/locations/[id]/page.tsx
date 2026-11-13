import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getLocation } from "@/services/location.service";
import { Badge } from "@/components/admin/ui/badge";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { LocationForm } from "@/components/admin/locations/location-form";
import { StatusToggle } from "@/components/admin/locations/status-toggle";
import { DeleteLocation } from "@/components/admin/locations/delete-location";
import { ButtonLink } from "@/components/admin/ui/button";
import { formatAdminDate } from "@/components/admin/subscription-badges";

export const metadata: Metadata = { title: "Pincode" };

export default async function LocationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "locations")) redirect("/admin/dashboard");
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  const location = await getLocation(id);
  if (!location) notFound();

  const canUpdate = can(user.role, "update", "locations");
  const canDelete = can(user.role, "delete", "locations");
  const editing = canUpdate && edit === "1";
  const details: [string, React.ReactNode][] = [
    ["City / Town", location.cityName],
    ["District", location.districtName],
    ["State", location.stateName],
    ["Country", location.countryName],
    ["Registered children", location.registered],
    ["Added", formatAdminDate(location.createdAt)],
    ["Last changed", formatAdminDate(location.updatedAt)],
    ["Remarks", location.remarks || "—"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/locations", label: "Serviceable locations" }}
        title={`Pincode ${location.pincode}`}
        description={`${location.cityName}, ${location.districtName}, ${location.stateName}`}
        actions={
          <>
            <Badge tone={location.isServiceable ? "green" : "slate"}>{location.isServiceable ? "Active" : "Inactive"}</Badge>
            {canUpdate && <StatusToggle id={id} pincode={location.pincode} isServiceable={location.isServiceable} registered={location.registered} />}
            {canUpdate && !editing && <ButtonLink href={`/admin/locations/${id}?edit=1`} variant="secondary">Edit</ButtonLink>}
            {canDelete && <DeleteLocation id={id} pincode={location.pincode} disabledReason={location.registered > 0 ? "Children are registered from this pincode. Deactivate it instead." : undefined} />}
          </>
        }
      />
      {editing ? (
        <Card>
          <LocationForm
            initial={{
              id, pincode: location.pincode, stateName: location.stateName, districtName: location.districtName, cityName: location.cityName,
              postOffices: location.postOffices.map((office) => ({ name: office.name, branchType: office.branchType ?? undefined, deliveryStatus: office.deliveryStatus ?? undefined })),
              isServiceable: location.isServiceable, remarks: location.remarks ?? "",
            }}
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Details" />
            <dl className="grid gap-x-8 gap-y-4 px-5 pb-5 sm:grid-cols-2 sm:px-6">
              {details.map(([term, value]) => (
                <div key={term}><dt className="text-xs font-medium text-slate-500">{term}</dt><dd className="mt-0.5 text-sm text-navy-900">{value}</dd></div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader title={`Post offices (${location.postOffices.length})`} />
            {location.postOffices.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-slate-500 sm:px-6">None on record.</p>
            ) : (
              <ul className="grid gap-2 px-5 pb-5 text-sm sm:grid-cols-2 sm:px-6">
                {location.postOffices.map((office) => (
                  <li key={office.name} className="rounded-xl border border-line px-3 py-2">{office.name}{office.branchType && <span className="block text-xs text-slate-500">{office.branchType}</span>}</li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
