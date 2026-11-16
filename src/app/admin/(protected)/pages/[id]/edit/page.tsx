import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getPageForEditor } from "@/services/cms-page.service";
import { systemPage } from "@/lib/cms/reserved";
import { PageBuilder } from "./page-builder";

export const metadata: Metadata = { title: "Page builder" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "update", "pages")) redirect("/admin/pages");
  const page = await getPageForEditor(id);
  if (!page) notFound();
  return (
    <PageBuilder
      page={{ id: page.id, status: page.status, isLive: page.isLive, hasDraft: page.hasDraft, liveSlug: page.liveSlug, publishAt: page.publishAt, content: JSON.parse(JSON.stringify(page.content)), systemKey: page.systemKey, path: page.systemKey ? (systemPage(page.systemKey)?.path ?? "/") : `/${page.liveSlug}` }}
      canPublish={can(user.role, "publish", "pages")}
      canDelete={can(user.role, "delete", "pages")}
    />
  );
}
