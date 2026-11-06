import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { getProgramme } from "@/services/programme.service";
import { listTopicCategories } from "@/services/topic.service";
import { ProgrammeForm } from "../../programme-form";
import { updateProgrammeAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Programme" };

export default async function EditProgrammePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "programmes")) redirect("/admin/dashboard");
  const { id } = await params;
  const [programme, categories] = await Promise.all([getProgramme(id), listTopicCategories()]);
  if (!programme) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit programme" description={`Ages ${programme.ageGroup} · ${programme.name}`} back={{ href: "/admin/programmes", label: "All programmes" }} />
      <ProgrammeForm
        action={updateProgrammeAction.bind(null, id)}
        submitLabel="Save changes"
        categories={categories.map((c) => ({ id: c._id.toString(), name: c.name, selectionLimit: c.selectionLimit, active: c.active }))}
        defaultValues={{
          name: programme.name,
          ageGroup: programme.ageGroup,
          description: programme.description ?? "",
          categories: (programme.categories ?? []).map((category) => category.toString()),
          displayOrder: programme.displayOrder,
          active: programme.active,
        }}
      />
    </div>
  );
}
