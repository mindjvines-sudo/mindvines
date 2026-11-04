import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AgeGroupForm } from "../age-group-form";
import { createAgeGroupAction } from "../actions";

export const metadata: Metadata = { title: "Add Age Group" };

export default function NewAgeGroupPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/age-groups", label: "All age groups" }}
        title="Add age group"
        description="Add an age group with a homepage card and its own page."
      />
      <AgeGroupForm action={createAgeGroupAction} submitLabel="Create age group" />
    </div>
  );
}
