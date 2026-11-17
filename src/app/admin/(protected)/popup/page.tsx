import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getPromoPopupForAdmin } from "@/services/promo-popup.service";
import { PageHeader } from "@/components/admin/ui/page-header";
import { PopupForm } from "./popup-form";

export const metadata: Metadata = { title: "Popup Banner" };

export default async function PopupPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "settings")) redirect("/admin/dashboard");
  const popup = await getPromoPopupForAdmin();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Popup banner" description="A promotional popup shown to visitors a few seconds after the site loads. It never appears on checkout or renewal pages." />
      <PopupForm initial={popup} canEdit={can(user.role, "update", "settings")} />
    </div>
  );
}
