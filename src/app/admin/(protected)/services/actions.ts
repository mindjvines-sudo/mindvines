"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { serviceInputSchema, type ServiceInput } from "@/validations/service.schema";
import * as serviceService from "@/services/service.service";
import { logAction } from "@/services/audit.service";
import type { ContentStatus } from "@/lib/constants";

type ServiceFieldErrors = Partial<Record<keyof ServiceInput, string[]>>;

export type ServiceFormState = {
  errors?: ServiceFieldErrors;
  message?: string;
} | undefined;

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
};

/** The repeatable sections arrive as JSON from their editors' hidden inputs. */
function json(formData: FormData, key: string): unknown {
  try {
    return JSON.parse(String(formData.get(key) ?? "[]"));
  } catch {
    return [];
  }
}

function buildInputFromFormData(formData: FormData) {
  const keywordsRaw = String(formData.get("seoKeywords") ?? "");
  return {
    name: formData.get("name"),
    slug: formData.get("slug"),
    tagline: text(formData, "tagline"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description") ?? "",
    icon: text(formData, "icon"),
    image: text(formData, "image"),
    bannerImage: text(formData, "bannerImage"),
    features: json(formData, "features"),
    process: json(formData, "process"),
    faqs: json(formData, "faqs"),
    status: formData.get("status"),
    seo: {
      title: text(formData, "seoTitle"),
      description: text(formData, "seoDescription"),
      canonical: text(formData, "seoCanonical"),
      keywords: keywordsRaw ? keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
      ogImage: text(formData, "seoOgImage"),
    },
  };
}

/** Groups zod issues by their top-level field, so "faqs.2.answer" reports on FAQs. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): ServiceFieldErrors {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    const list = (errors[key] ??= []);
    if (!list.includes(issue.message)) list.push(issue.message);
  }
  return errors;
}

// The listing, each service page, and the carousels on the home page
// ("Conditions We Treat") and About page ("Our Department") all show services.
function revalidateServicePages(...slugs: (string | undefined)[]) {
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/services");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/services/${slug}`);
  }
}

export async function createServiceAction(_prev: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "services")) {
    return { message: "You do not have permission to create services." };
  }

  const validated = serviceInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: fieldErrors(validated.error.issues) };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "services")) {
    return { message: "You do not have permission to publish directly. Save as draft instead." };
  }

  if (await serviceService.isServiceSlugTaken(validated.data.slug)) {
    return { errors: { slug: ["Another service already uses this slug."] } };
  }

  const service = await serviceService.createService(validated.data, user.id);
  await logAction({ userId: user.id, action: "CREATE", entity: "Service", entityId: service._id.toString() });
  revalidateServicePages(service.slug);
  redirect("/admin/services");
}

export async function updateServiceAction(
  id: string,
  _prev: ServiceFormState,
  formData: FormData
): Promise<ServiceFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "services")) {
    return { message: "You do not have permission to edit services." };
  }

  const validated = serviceInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: fieldErrors(validated.error.issues) };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "services")) {
    return { message: "You do not have permission to publish directly." };
  }

  if (await serviceService.isServiceSlugTaken(validated.data.slug, id)) {
    return { errors: { slug: ["Another service already uses this slug."] } };
  }

  const result = await serviceService.updateService(id, validated.data, user.id);
  if (!result) {
    return { message: "Service not found." };
  }

  await logAction({ userId: user.id, action: "UPDATE", entity: "Service", entityId: id });
  revalidateServicePages(result.service.slug, result.previousSlug);
  redirect("/admin/services");
}

export async function setServiceStatusAction(id: string, status: ContentStatus) {
  const user = await getCurrentUser();
  const action = status === "PUBLISHED" ? "publish" : "update";
  if (!can(user.role, action, "services")) {
    throw new Error("You do not have permission to change this service's status.");
  }

  const updated = await serviceService.setServiceStatus(id, status, user.id);
  await logAction({
    userId: user.id,
    action: status === "PUBLISHED" ? "PUBLISH" : status === "ARCHIVED" ? "ARCHIVE" : "UNPUBLISH",
    entity: "Service",
    entityId: id,
  });
  revalidateServicePages(updated?.slug);
  revalidatePath("/admin/services");
  revalidatePath(`/admin/services/${id}/edit`);
}

export async function deleteServiceAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "services")) {
    throw new Error("You do not have permission to delete services.");
  }

  const deleted = await serviceService.deleteService(id);
  await logAction({ userId: user.id, action: "DELETE", entity: "Service", entityId: id });
  revalidateServicePages(deleted?.slug);
  redirect("/admin/services");
}

export async function reorderServiceAction(id: string, direction: "up" | "down") {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "services")) {
    throw new Error("You do not have permission to reorder services.");
  }

  await serviceService.reorderService(id, direction);
  revalidateServicePages();
  revalidatePath("/admin/services");
}
