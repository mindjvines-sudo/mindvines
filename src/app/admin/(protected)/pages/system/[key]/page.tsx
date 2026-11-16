import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { systemPage } from "@/lib/cms/reserved";
import { EMPTY_SEO } from "@/lib/cms/sections";
import { getSystemSeo } from "@/services/cms-page.service";
import { PageHeader } from "@/components/admin/ui/page-header";
import { SystemSeoForm } from "./system-seo-form";

export const metadata: Metadata = { title: "Page SEO" };

export default async function SystemPageSeo({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const meta = systemPage(key);
  if (!meta) notFound();
  const user = await getCurrentUser();
  if (!can(user.role, "read", "pages")) redirect("/admin/pages");
  const seo = (await getSystemSeo(key)) ?? EMPTY_SEO;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader back={{ href: "/admin/pages", label: "All pages" }} title={`${meta.title}: SEO`} description={`Search and sharing details for ${meta.path}. Anything you leave blank keeps the page's current value. To change the page itself, use Edit page.`} />
      <SystemSeoForm pageKey={key} initial={seo} canEdit={can(user.role, "update", "pages")} />
    </div>
  );
}
