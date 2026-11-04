import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/page-header";
import { BlogForm } from "../blog-form";
import { createBlogPostAction } from "../actions";

export const metadata: Metadata = { title: "New Blog Post" };

export default function NewBlogPostPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/blog", label: "All posts" }}
        title="New blog post"
        description="Write an article for patients. Save it as a draft until it’s ready to publish."
      />
      <BlogForm action={createBlogPostAction} submitLabel="Create post" />
    </div>
  );
}
