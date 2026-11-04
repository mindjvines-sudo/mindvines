import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageByIdAdmin } from "@/services/page.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageForm } from "../../page-form";
import { updatePageAction, setPageStatusAction } from "../../actions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { ActionButton } from "@/components/admin/ui/confirm-action";
import { ArchiveIcon, CheckCircleIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Edit Page" };

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, page] = await Promise.all([getCurrentUser(), getPageByIdAdmin(id)]);

  if (!page) {
    notFound();
  }

  const boundUpdate = updatePageAction.bind(null, id);
  const canPublish = can(user.role, "publish", "pages");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/pages", label: "All pages" }}
        title="Edit page"
        meta={<StatusBadge status={page.status} />}
        description={page.title}
        actions={
          canPublish && (
            <>
              {page.status !== "PUBLISHED" && (
                <form action={setPageStatusAction.bind(null, id, "PUBLISHED")}>
                  <ActionButton variant="primary" size="md" pendingLabel="Publishing…">
                    <CheckCircleIcon />
                    Publish
                  </ActionButton>
                </form>
              )}
              {page.status === "PUBLISHED" && (
                <form action={setPageStatusAction.bind(null, id, "DRAFT")}>
                  <ActionButton variant="secondary" size="md" pendingLabel="Updating…">
                    Unpublish
                  </ActionButton>
                </form>
              )}
              {page.status !== "ARCHIVED" && (
                <form action={setPageStatusAction.bind(null, id, "ARCHIVED")}>
                  <ActionButton variant="secondary" size="md" pendingLabel="Archiving…">
                    <ArchiveIcon />
                    Archive
                  </ActionButton>
                </form>
              )}
            </>
          )
        }
      />

      <PageForm
        action={boundUpdate}
        submitLabel="Save changes"
        defaultValues={{
          title: page.title,
          slug: page.slug,
          content: page.content,
          excerpt: page.excerpt ?? undefined,
          featuredImage: page.featuredImage ?? undefined,
          status: page.status,
          seo: page.seo
            ? {
                title: page.seo.title ?? undefined,
                description: page.seo.description ?? undefined,
                canonical: page.seo.canonical ?? undefined,
                keywords: page.seo.keywords ?? undefined,
                ogImage: page.seo.ogImage ?? undefined,
              }
            : undefined,
        }}
      />
    </div>
  );
}
