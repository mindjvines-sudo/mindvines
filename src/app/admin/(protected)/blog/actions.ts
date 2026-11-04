"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { blogPostInputSchema, type BlogPostInput } from "@/validations/blog.schema";
import * as blogService from "@/services/blog.service";
import { logAction } from "@/services/audit.service";
import type { ContentStatus } from "@/lib/constants";

export type BlogFormState = {
  errors?: Partial<Record<keyof BlogPostInput, string[]>>;
  message?: string;
} | undefined;

function buildInputFromFormData(formData: FormData) {
  const keywordsRaw = String(formData.get("seoKeywords") ?? "");
  return {
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt") || undefined,
    content: formData.get("content"),
    featuredImage: formData.get("featuredImage") || undefined,
    status: formData.get("status"),
    seo: {
      title: formData.get("seoTitle") || undefined,
      description: formData.get("seoDescription") || undefined,
      canonical: formData.get("seoCanonical") || undefined,
      keywords: keywordsRaw
        ? keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean)
        : undefined,
      ogImage: formData.get("seoOgImage") || undefined,
    },
  };
}

function revalidateBlogPages() {
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
}

export async function createBlogPostAction(_prev: BlogFormState, formData: FormData): Promise<BlogFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "blog")) {
    return { message: "You do not have permission to create blog posts." };
  }

  const validated = blogPostInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "blog")) {
    return { message: "You do not have permission to publish directly. Save as draft instead." };
  }

  const post = await blogService.createBlogPost(validated.data, user.id);
  await logAction({ userId: user.id, action: "CREATE", entity: "BlogPost", entityId: post._id.toString() });
  revalidateBlogPages();
  redirect("/admin/blog");
}

export async function updateBlogPostAction(
  id: string,
  _prev: BlogFormState,
  formData: FormData
): Promise<BlogFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "blog")) {
    return { message: "You do not have permission to edit blog posts." };
  }

  const validated = blogPostInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "blog")) {
    return { message: "You do not have permission to publish directly." };
  }

  const updated = await blogService.updateBlogPost(id, validated.data, user.id);
  if (!updated) {
    return { message: "Blog post not found." };
  }

  await logAction({ userId: user.id, action: "UPDATE", entity: "BlogPost", entityId: id });
  revalidateBlogPages();
  revalidatePath(`/blog/${validated.data.slug}`);
  redirect("/admin/blog");
}

export async function setBlogPostStatusAction(id: string, status: ContentStatus) {
  const user = await getCurrentUser();
  const action = status === "PUBLISHED" ? "publish" : "update";
  if (!can(user.role, action, "blog")) {
    throw new Error("You do not have permission to change this post's status.");
  }

  const updated = await blogService.setBlogPostStatus(id, status, user.id);
  await logAction({
    userId: user.id,
    action: status === "PUBLISHED" ? "PUBLISH" : status === "ARCHIVED" ? "ARCHIVE" : "UNPUBLISH",
    entity: "BlogPost",
    entityId: id,
  });
  revalidateBlogPages();
  revalidatePath("/admin/blog");
  if (updated) revalidatePath(`/blog/${updated.slug}`);
}

export async function deleteBlogPostAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "blog")) {
    throw new Error("You do not have permission to delete blog posts.");
  }

  const deleted = await blogService.deleteBlogPost(id);
  await logAction({ userId: user.id, action: "DELETE", entity: "BlogPost", entityId: id });
  if (deleted) revalidatePath(`/blog/${deleted.slug}`);
  revalidateBlogPages();
  redirect("/admin/blog");
}
