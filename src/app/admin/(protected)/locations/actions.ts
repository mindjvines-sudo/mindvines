"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { locationInputSchema, type LocationInput } from "@/validations/location.schema";
import * as locationService from "@/services/location.service";
import { logAction } from "@/services/audit.service";
import type { ContentStatus } from "@/lib/constants";

type LocationFieldErrors = Partial<Record<keyof LocationInput, string[]>>;

export type LocationFormState = {
  errors?: LocationFieldErrors;
  message?: string;
} | undefined;

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const optional = (formData: FormData, key: string) => str(formData, key).trim() || undefined;

/** Repeatable rows arrive as JSON from their editors' hidden inputs. */
function json(formData: FormData, key: string): unknown {
  try {
    return JSON.parse(str(formData, key) || "[]");
  } catch {
    return [];
  }
}

/** One item per line — used for the conditions list. */
const lines = (formData: FormData, key: string) =>
  str(formData, key)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Paragraphs separated by a blank line. */
const paragraphs = (formData: FormData, key: string) =>
  str(formData, key)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

const title = (formData: FormData, key: string) => ({
  lead: str(formData, `${key}.lead`),
  accent: str(formData, `${key}.accent`),
});

function buildInputFromFormData(formData: FormData) {
  return {
    name: str(formData, "name"),
    slug: str(formData, "slug"),
    title: str(formData, "title"),
    eyebrow: str(formData, "eyebrow"),
    heading: title(formData, "heading"),
    intro: str(formData, "intro"),
    address: {
      street: str(formData, "address.street"),
      area: str(formData, "address.area"),
      city: str(formData, "address.city"),
    },
    phone: str(formData, "phone"),
    stats: json(formData, "stats"),
    approach: {
      title: title(formData, "approach.title"),
      paragraphs: paragraphs(formData, "approach.paragraphs"),
      image: optional(formData, "approachImage"),
    },
    services: {
      lead: str(formData, "services.lead"),
      accent: str(formData, "services.accent"),
      intro: str(formData, "services.intro"),
    },
    serviceItems: json(formData, "serviceItems"),
    conditionsTitle: title(formData, "conditionsTitle"),
    conditions: lines(formData, "conditions"),
    why: { title: title(formData, "why.title"), points: json(formData, "why.points") },
    corporate: { title: str(formData, "corporate.title"), paragraphs: paragraphs(formData, "corporate.paragraphs") },
    faqTitle: title(formData, "faqTitle"),
    faqs: json(formData, "faqs"),
    bannerImage: optional(formData, "bannerImage"),
    teamImage: optional(formData, "teamImage"),
    corporateImage: optional(formData, "corporateImage"),
    seo: { title: str(formData, "seo.title"), description: str(formData, "seo.description") },
    status: formData.get("status"),
  };
}

/** Groups zod issues by top-level field, so "faqs.2.answer" reports on FAQs. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): LocationFieldErrors {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    const list = (errors[key] ??= []);
    if (!list.includes(issue.message)) list.push(issue.message);
  }
  return errors;
}

// Every public page carries the Locations menu, so the whole layout is
// refreshed, along with the clinic pages themselves and the sitemap.
function revalidateWebsite(...slugs: (string | undefined)[]) {
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/${slug}`);
  }
}

export async function createLocationAction(_prev: LocationFormState, formData: FormData): Promise<LocationFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "locations")) {
    return { message: "You do not have permission to add locations." };
  }

  const validated = locationInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: fieldErrors(validated.error.issues) };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "locations")) {
    return { message: "You do not have permission to publish directly. Save as draft instead." };
  }

  if (await locationService.isLocationSlugTaken(validated.data.slug)) {
    return { errors: { slug: ["Another location already uses this address."] } };
  }

  const location = await locationService.createLocation(validated.data);
  await logAction({ userId: user.id, action: "CREATE", entity: "Location", entityId: location._id.toString() });
  revalidateWebsite(location.slug);
  redirect("/admin/locations");
}

export async function updateLocationAction(
  id: string,
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "locations")) {
    return { message: "You do not have permission to edit locations." };
  }

  const validated = locationInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: fieldErrors(validated.error.issues) };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "locations")) {
    return { message: "You do not have permission to publish directly." };
  }

  if (await locationService.isLocationSlugTaken(validated.data.slug, id)) {
    return { errors: { slug: ["Another location already uses this address."] } };
  }

  const result = await locationService.updateLocation(id, validated.data);
  if (!result) {
    return { message: "Location not found." };
  }

  await logAction({ userId: user.id, action: "UPDATE", entity: "Location", entityId: id });
  revalidateWebsite(result.location.slug, result.previousSlug);
  redirect("/admin/locations");
}

export async function setLocationStatusAction(id: string, status: ContentStatus) {
  const user = await getCurrentUser();
  const action = status === "PUBLISHED" ? "publish" : "update";
  if (!can(user.role, action, "locations")) {
    throw new Error("You do not have permission to change this location's status.");
  }

  const updated = await locationService.setLocationStatus(id, status);
  await logAction({
    userId: user.id,
    action: status === "PUBLISHED" ? "PUBLISH" : status === "ARCHIVED" ? "ARCHIVE" : "UNPUBLISH",
    entity: "Location",
    entityId: id,
  });
  revalidateWebsite(updated?.slug);
  revalidatePath("/admin/locations");
}

export async function deleteLocationAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "locations")) {
    throw new Error("You do not have permission to delete locations.");
  }

  const deleted = await locationService.deleteLocation(id);
  await logAction({ userId: user.id, action: "DELETE", entity: "Location", entityId: id });
  revalidateWebsite(deleted?.slug);
  redirect("/admin/locations");
}

export async function reorderLocationAction(id: string, direction: "up" | "down") {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "locations")) {
    throw new Error("You do not have permission to reorder locations.");
  }

  await locationService.reorderLocation(id, direction);
  revalidateWebsite();
  revalidatePath("/admin/locations");
}
