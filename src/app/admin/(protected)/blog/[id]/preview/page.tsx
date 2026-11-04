import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getBlogPostByIdAdmin } from "@/services/blog.service";
import { asPopulatedMedia } from "@/types/media";
import { BlogImageViewer } from "../../blog-image-viewer";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { ButtonLink } from "@/components/admin/ui/button";
import { Card } from "@/components/admin/ui/card";
import { PencilIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Preview Blog Post",
  robots: { index: false, follow: false },
};

export default async function BlogPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "blog")) notFound();

  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  const post = await getBlogPostByIdAdmin(id);
  if (!post) notFound();
  const image = asPopulatedMedia(post.featuredImage);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/blog", label: "All posts" }}
        title="Preview"
        meta={<StatusBadge status={post.status} />}
        description="This shows the saved version of the post."
        actions={
          can(user.role, "update", "blog") && (
            <ButtonLink href={`/admin/blog/${id}/edit`}>
              <PencilIcon />
              Edit post
            </ButtonLink>
          )
        }
      />
      <Card as="article" className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-6 p-6 sm:p-10">
          <header className="flex flex-col gap-3">
            <p className="text-[13px] text-slate-500">
              {post.publishedAt ? `Published ${new Date(post.publishedAt).toLocaleDateString()}` : "Not published"}
              {post.readingTime ? ` · ${post.readingTime} min read` : ""}
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-navy-900 sm:text-4xl">{post.title}</h1>
            {post.excerpt && <p className="text-lg leading-8 text-slate-600">{post.excerpt}</p>}
          </header>
          {image && <BlogImageViewer image={{ secureUrl: image.secureUrl, altText: image.altText }} title={post.title} large />}
          {/* Matches public rendering of HTML authored by authenticated blog editors. */}
          <div
            className="prose prose-slate max-w-none break-words prose-headings:text-navy-900 prose-a:text-primary-700"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </Card>
    </div>
  );
}
