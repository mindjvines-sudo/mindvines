import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { listTopicCategories } from "@/services/topic.service";
import { ProgrammeForm } from "../programme-form";
import { createProgrammeAction } from "../actions";

export const metadata: Metadata = { title: "Add Programme" };

export default async function NewProgrammePage() {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "programmes")) redirect("/admin/dashboard");
  const categories = await listTopicCategories();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add programme" back={{ href: "/admin/programmes", label: "All programmes" }} />
      <ProgrammeForm
        action={createProgrammeAction}
        submitLabel="Add programme"
        categories={categories.map((c) => ({ id: c._id.toString(), name: c.name, selectionLimit: c.selectionLimit, active: c.active }))}
      />
    </div>
  );
}
