import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getSystemPageId } from "@/services/cms-page.service";

/** Opens a built-in page in the same page builder as any other page. */
export default async function EditSystemPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "update", "pages")) redirect("/admin/pages");
  const id = await getSystemPageId(key, user.id);
  if (!id) notFound();
  redirect(`/admin/pages/${id}/edit`);
}
