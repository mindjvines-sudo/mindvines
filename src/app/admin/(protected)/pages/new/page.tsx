import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { NewPageForm } from "./new-page-form";

export const metadata: Metadata = { title: "Create page" };

export default async function NewPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "pages")) redirect("/admin/pages");
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <PageHeader back={{ href: "/admin/pages", label: "All pages" }} title="Create page" description="Name the page and choose its address. You'll add the content with the page builder next; nothing is public until you publish." />
      <NewPageForm />
    </div>
  );
}
