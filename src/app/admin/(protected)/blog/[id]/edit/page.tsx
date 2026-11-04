import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlogPostByIdAdmin } from "@/services/blog.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { BlogForm, type BlogFormDefaults } from "../../blog-form";
import { updateBlogPostAction, setBlogPostStatusAction } from "../../actions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { ButtonLink } from "@/components/admin/ui/button";
import { ActionButton } from "@/components/admin/ui/confirm-action";
import { ArchiveIcon, CheckCircleIcon, EyeIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Edit Blog Post" };

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, post] = await Promise.all([getCurrentUser(), getBlogPostByIdAdmin(id)]);

  if (!post) {
    notFound();
  }

  const boundUpdate = updateBlogPostAction.bind(null, id);
  const canPublish = can(user.role, "publish", "blog");

  const featuredImage =
    post.featuredImage && typeof post.featuredImage === "object" && "secureUrl" in post.featuredImage
      ? JSON.parse(JSON.stringify(post.featuredImage))
      : null;

  const defaultValues: BlogFormDefaults = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? undefined,
    content: post.content,
    featuredImage,
    status: post.status,
    seo: post.seo
      ? {
          title: post.seo.title ?? undefined,
          description: post.seo.description ?? undefined,
          canonical: post.seo.canonical ?? undefined,
          keywords: post.seo.keywords ?? undefined,
          ogImage: post.seo.ogImage ?? undefined,
        }
      : undefined,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/blog", label: "All posts" }}
        title="Edit blog post"
        meta={<StatusBadge status={post.status} />}
        description={post.title}
        actions={
          <>
            <ButtonLink href={`/admin/blog/${id}/preview`} variant="secondary">
              <EyeIcon />
              Preview
            </ButtonLink>
            {canPublish && post.status !== "PUBLISHED" && (
              <form action={setBlogPostStatusAction.bind(null, id, "PUBLISHED")}>
                <ActionButton variant="primary" size="md" pendingLabel="Publishing…">
                  <CheckCircleIcon />
                  Publish
                </ActionButton>
              </form>
            )}
            {canPublish && post.status === "PUBLISHED" && (
              <form action={setBlogPostStatusAction.bind(null, id, "DRAFT")}>
                <ActionButton variant="secondary" size="md" pendingLabel="Updating…">
                  Unpublish
                </ActionButton>
              </form>
            )}
            {canPublish && post.status !== "ARCHIVED" && (
              <form action={setBlogPostStatusAction.bind(null, id, "ARCHIVED")}>
                <ActionButton variant="secondary" size="md" pendingLabel="Archiving…">
                  <ArchiveIcon />
                  Archive
                </ActionButton>
              </form>
            )}
          </>
        }
      />

      <BlogForm action={boundUpdate} submitLabel="Save changes" defaultValues={defaultValues} />
    </div>
  );
}
