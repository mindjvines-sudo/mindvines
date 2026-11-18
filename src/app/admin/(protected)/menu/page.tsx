import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { DEFAULT_MENU } from "@/lib/content";
import { getMenuConfig } from "@/services/settings.service";
import { listAgeGroupPagesByPlanAge } from "@/services/age-group.service";
import { PageHeader } from "@/components/admin/ui/page-header";
import { MenuEditor } from "./menu-editor";

export const metadata: Metadata = { title: "Site Menu" };

export default async function MenuPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "settings")) redirect("/admin/dashboard");
  const [config, agePages] = await Promise.all([getMenuConfig(), listAgeGroupPagesByPlanAge()]);
  const items = config ?? DEFAULT_MENU;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Site menu" description="Manage the website’s slide-in menu. Edit names and URLs, including the age-group links inside each dropdown." />
      <MenuEditor initial={items} defaults={DEFAULT_MENU} agePages={agePages.map(({ ageGroup, slug }) => ({ ageGroup, slug }))} canEdit={can(user.role, "update", "settings")} />
    </div>
  );
}
