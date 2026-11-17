import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { DEFAULT_MENU } from "@/lib/content";
import { getMenuConfig } from "@/services/settings.service";
import { PageHeader } from "@/components/admin/ui/page-header";
import { MenuEditor } from "./menu-editor";

export const metadata: Metadata = { title: "Site Menu" };

export default async function MenuPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "settings")) redirect("/admin/dashboard");
  const items = (await getMenuConfig()) ?? DEFAULT_MENU;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Site menu" description="The slide-in menu on the website. Rename, reorder, hide or add links." />
      <MenuEditor initial={items} defaults={DEFAULT_MENU} canEdit={can(user.role, "update", "settings")} />
    </div>
  );
}
