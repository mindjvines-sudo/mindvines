import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ServiceForm } from "../service-form";
import { createServiceAction } from "../actions";

export const metadata: Metadata = { title: "Add Service" };

export default function NewServicePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/services", label: "All services" }}
        title="Add service"
        description="Create a service with its own page at /services/your-slug."
      />
      <ServiceForm action={createServiceAction} submitLabel="Create service" />
    </div>
  );
}
