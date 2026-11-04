import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/page-header";
import { LocationForm } from "../location-form";
import { createLocationAction } from "../actions";

export const metadata: Metadata = { title: "Add Location" };

export default function NewLocationPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/locations", label: "All locations" }}
        title="Add location"
        description="Add a clinic with its own page and an entry in the Locations menu."
      />
      <LocationForm action={createLocationAction} submitLabel="Create location" />
    </div>
  );
}
