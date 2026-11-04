import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/page-header";
import { DoctorForm } from "../doctor-form";
import { createDoctorAction } from "../actions";

export const metadata: Metadata = { title: "Add Doctor" };

export default function NewDoctorPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/doctors", label: "All doctors" }}
        title="Add doctor"
        description="Add a member of the clinical team to the website."
      />
      <DoctorForm action={createDoctorAction} submitLabel="Create doctor" />
    </div>
  );
}
