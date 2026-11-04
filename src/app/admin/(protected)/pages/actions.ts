"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { pageInputSchema, type PageInput } from "@/validations/page.schema";
import * as pageService from "@/services/page.service";
import { logAction } from "@/services/audit.service";
import type { ContentStatus } from "@/lib/constants";

export type PageFormState = {
  errors?: Partial<Record<keyof PageInput, string[]>>;
  message?: string;
} | undefined;

function buildInputFromFormData(formData: FormData) {
  const keywordsRaw = String(formData.get("seoKeywords") ?? "");
  return {
    title: formData.get("title"),
    slug: formData.get("slug"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") || undefined,
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

function revalidatePublicPages() {
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

export async function createPageAction(_prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "pages")) {
    return { message: "You do not have permission to create pages." };
  }

  const validated = pageInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "pages")) {
    return { message: "You do not have permission to publish pages directly. Save as draft instead." };
  }

  const page = await pageService.createPage(validated.data, user.id);
  await logAction({ userId: user.id, action: "CREATE", entity: "Page", entityId: page._id.toString() });
  revalidatePublicPages();
  redirect("/admin/pages");
}

export async function updatePageAction(
  id: string,
  _prev: PageFormState,
  formData: FormData
): Promise<PageFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "pages")) {
    return { message: "You do not have permission to edit pages." };
  }

  const validated = pageInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "pages")) {
    return { message: "You do not have permission to publish pages directly." };
  }

  const updated = await pageService.updatePage(id, validated.data, user.id);
  if (!updated) {
    return { message: "Page not found." };
  }

  await logAction({ userId: user.id, action: "UPDATE", entity: "Page", entityId: id });
  revalidatePublicPages();
  revalidatePath(`/${validated.data.slug}`);
  redirect("/admin/pages");
}

export async function setPageStatusAction(id: string, status: ContentStatus) {
  const user = await getCurrentUser();
  const action = status === "PUBLISHED" ? "publish" : "update";
  if (!can(user.role, action, "pages")) {
    throw new Error("You do not have permission to change this page's status.");
  }

  const updated = await pageService.setPageStatus(id, status, user.id);
  await logAction({
    userId: user.id,
    action: status === "PUBLISHED" ? "PUBLISH" : status === "ARCHIVED" ? "ARCHIVE" : "UNPUBLISH",
    entity: "Page",
    entityId: id,
  });
  revalidatePublicPages();
  revalidatePath("/admin/pages");
  if (updated) revalidatePath(`/${updated.slug}`);
}

export async function deletePageAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "pages")) {
    throw new Error("You do not have permission to delete pages.");
  }

  const deleted = await pageService.deletePage(id);
  await logAction({ userId: user.id, action: "DELETE", entity: "Page", entityId: id });
  revalidatePublicPages();
  if (deleted) revalidatePath(`/${deleted.slug}`);
  redirect("/admin/pages");
}
