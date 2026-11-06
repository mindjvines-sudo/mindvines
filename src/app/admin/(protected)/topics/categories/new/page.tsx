import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { CategoryForm } from "../category-form";
import { createCategoryAction } from "../../actions";

export const metadata: Metadata = { title: "Add Topic Category" };

export default async function NewCategoryPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "topics")) redirect("/admin/dashboard");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add topic category" back={{ href: "/admin/topics/categories", label: "All categories" }} />
      <CategoryForm action={createCategoryAction} submitLabel="Add category" />
    </div>
  );
}
