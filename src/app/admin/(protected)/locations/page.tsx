import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { listLocationFilterOptions, listLocations, locationSummary, parseLocationFilters } from "@/services/location.service";
import { Badge } from "@/components/admin/ui/badge";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { EmptyState } from "@/components/admin/ui/feedback";
import { Pagination, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import { inputClasses } from "@/components/admin/ui/form";
import { StatTile } from "@/components/admin/stat-tile";
import { StatusToggle } from "@/components/admin/locations/status-toggle";
import { CheckCircleIcon, GlobeIcon, PeopleIcon, PlusIcon, SearchIcon, XIcon } from "@/components/admin/icons";
import { formatAdminDate } from "@/components/admin/subscription-badges";

export const metadata: Metadata = { title: "Serviceable Locations" };

const label = "flex flex-col gap-1 text-xs font-medium text-slate-600";

export default async function LocationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "locations")) redirect("/admin/dashboard");

  const filters = parseLocationFilters(await searchParams);
  const [result, summary, options] = await Promise.all([listLocations(filters), locationSummary(), listLocationFilterOptions()]);
  const active = Object.fromEntries(Object.entries({ search: filters.search, state: filters.state, district: filters.district, status: filters.status }).filter(([, v]) => v));
  const filtered = Object.keys(active).length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Serviceable locations"
        description="Children can only be registered from the active pincodes below. Deactivating a pincode never affects children already registered."
        actions={
          <>
            <a href={hrefWith("/api/admin/serviceable-locations/export", active)} className={buttonClasses({ variant: "secondary" })}>Export CSV</a>
            <ButtonLink href="/admin/locations/new"><PlusIcon />Add pincode</ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={GlobeIcon} label="Serviceable pincodes" value={summary.total} color="teal" note="In the list" />
        <StatTile icon={CheckCircleIcon} label="Active locations" value={summary.active} color="green" note="Accepting registrations" />
        <StatTile icon={XIcon} label="Inactive locations" value={summary.inactive} color="slate" note="Registrations blocked" />
        <StatTile icon={PeopleIcon} label="Registrations from listed pincodes" value={summary.registrationsFromListed} color="violet" note="Completed registrations" href="/admin/locations/directory" />
      </div>

      <Card className="overflow-hidden">
        <form method="get" role="search" className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-5">
          <label className={`relative ${label} xl:col-span-2`}>
            Search
            <SearchIcon className="pointer-events-none absolute bottom-[11px] left-3 size-4 text-slate-400" />
            <input type="search" name="search" defaultValue={filters.search} placeholder="Pincode, city, district or state" className={inputClasses(false, "h-10 pl-9")} />
          </label>
          <label className={label}>
            State
            <select name="state" defaultValue={filters.state ?? ""} className={inputClasses(false, "admin-select h-10")}>
              <option value="">All states</option>
              {options.states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
          <label className={label}>
            District
            <select name="district" defaultValue={filters.district ?? ""} className={inputClasses(false, "admin-select h-10")}>
              <option value="">All districts</option>
              {options.districts.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </label>
          <label className={label}>
            Status
            <select name="status" defaultValue={filters.status ?? ""} className={inputClasses(false, "admin-select h-10")}>
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-5">
            <button type="submit" className={buttonClasses({ variant: "primary" })}>Apply filters</button>
            {filtered && <ButtonLink href="/admin/locations" variant="secondary">Clear filters</ButtonLink>}
          </div>
        </form>

        {result.items.length === 0 ? (
          <EmptyState
            icon={GlobeIcon}
            title={filtered ? "No matching pincodes" : "No serviceable pincodes yet"}
            description={filtered ? "Try a different search or filter." : "Registration is closed until you add at least one active pincode."}
            action={!filtered ? <ButtonLink href="/admin/locations/new"><PlusIcon />Add pincode</ButtonLink> : undefined}
            className="border-t border-line"
          />
        ) : (
          <Table minWidth={1080}>
            <THead>
              <tr>
                <Th>Pincode</Th>
                <Th>City / Town</Th>
                <Th>District</Th>
                <Th>State</Th>
                <Th>Country</Th>
                <Th>Post office</Th>
                <Th align="right">Children</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item) => {
                const id = item._id.toString();
                const first = item.postOffices[0]?.name;
                return (
                  <Tr key={id}>
                    <Td className="font-mono text-xs font-medium"><Link href={`/admin/locations/${id}`} className="text-navy-900 hover:text-primary-700">{item.pincode}</Link></Td>
                    <Td>{item.cityName}</Td>
                    <Td>{item.districtName}</Td>
                    <Td>{item.stateName}</Td>
                    <Td>{item.countryName}</Td>
                    <Td>
                      <span className="block max-w-[180px] truncate">{first ?? "—"}</span>
                      {item.postOffices.length > 1 && <span className="text-xs text-slate-400">+{item.postOffices.length - 1} more</span>}
                    </Td>
                    <Td align="right" className="tabular-nums">{item.registered}</Td>
                    <Td><Badge tone={item.isServiceable ? "green" : "slate"}>{item.isServiceable ? "Active" : "Inactive"}</Badge></Td>
                    <Td className="whitespace-nowrap tabular-nums">{formatAdminDate(item.createdAt)}</Td>
                    <Td align="right">
                      <RowActions>
                        <ButtonLink href={`/admin/locations/${id}`} variant="ghost" size="sm">View</ButtonLink>
                        <ButtonLink href={`/admin/locations/${id}?edit=1`} variant="ghost" size="sm">Edit</ButtonLink>
                        <StatusToggle id={id} pincode={item.pincode} isServiceable={item.isServiceable} registered={item.registered} />
                      </RowActions>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}

        <Pagination path="/admin/locations" page={result.page} pages={result.pages} total={result.total} limit={result.limit} params={active} noun="pincodes" />
      </Card>
    </div>
  );
}
