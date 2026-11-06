import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { getTopicCategory } from "@/services/topic.service";
import { CategoryForm } from "../../category-form";
import { updateCategoryAction } from "../../../actions";

export const metadata: Metadata = { title: "Edit Topic Category" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "topics")) redirect("/admin/dashboard");
  const { id } = await params;
  const category = await getTopicCategory(id);
  if (!category) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit topic category" description={category.name} back={{ href: "/admin/topics/categories", label: "All categories" }} />
      <CategoryForm
        action={updateCategoryAction.bind(null, id)}
        submitLabel="Save changes"
        defaultValues={{
          name: category.name,
          heading: category.heading,
          description: category.description ?? "",
          selectionLimit: category.selectionLimit,
          displayOrder: category.displayOrder,
          active: category.active,
        }}
      />
    </div>
  );
}
