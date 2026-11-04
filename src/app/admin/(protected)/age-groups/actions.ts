"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { ageGroupInputSchema, type AgeGroupInput } from "@/validations/age-group.schema";
import * as ageGroupService from "@/services/age-group.service";
import { updateAgeGroupsHeading } from "@/services/settings.service";
import { logAction } from "@/services/audit.service";
import type { ContentStatus } from "@/lib/constants";

type AgeGroupFieldErrors = Partial<Record<keyof AgeGroupInput, string[]>>;

export type AgeGroupFormState = {
  errors?: AgeGroupFieldErrors;
  message?: string;
} | undefined;

const str = (formData: FormData, key: string) => String(formData.get(key) ?? "");

/** Repeatable rows arrive as JSON from their editors' hidden inputs. */
function json(formData: FormData, key: string): unknown {
  try {
    return JSON.parse(str(formData, key) || "[]");
  } catch {
    return [];
  }
}

function buildInputFromFormData(formData: FormData) {
  return {
    title: str(formData, "title"),
    slug: str(formData, "slug"),
    subtitle: str(formData, "subtitle"),
    summary: str(formData, "summary"),
    cardImage: str(formData, "cardImage"),
    hero: {
      heading: str(formData, "hero.heading"),
      subheading: str(formData, "hero.subheading"),
      image: str(formData, "heroImage"),
    },
    highlights: {
      heading: str(formData, "highlights.heading"),
      intro: str(formData, "highlights.intro"),
      slides: json(formData, "highlights.slides"),
      note: str(formData, "highlights.note"),
      cta: { label: str(formData, "highlights.cta.label"), href: str(formData, "highlights.cta.href") },
    },
    collections: json(formData, "collections"),
    stats: {
      heading: str(formData, "stats.heading"),
      image: str(formData, "statsImage"),
      items: json(formData, "stats.items"),
    },
    plans: {
      show: formData.get("plans.show") === "on",
      ageGroup: str(formData, "plans.ageGroup"),
      heading: str(formData, "plans.heading"),
      intro: str(formData, "plans.intro"),
      priceNote: str(formData, "plans.priceNote"),
      footnote: str(formData, "plans.footnote"),
    },
    gallery: { heading: str(formData, "gallery.heading"), tabs: json(formData, "gallery.tabs") },
    testimonials: { heading: str(formData, "testimonials.heading"), items: json(formData, "testimonials.items") },
    seo: { title: str(formData, "seo.title"), description: str(formData, "seo.description") },
    status: formData.get("status"),
  };
}

/** Groups zod issues by section, so "collections.1.items.0.title" reports on Collections. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): AgeGroupFieldErrors {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    const list = (errors[key] ??= []);
    if (!list.includes(issue.message)) list.push(issue.message);
  }
  return errors;
}

// The homepage lists the cards; each age group also has its own page.
function revalidateWebsite(...slugs: (string | undefined)[]) {
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/age-groups/${slug}`);
  }
}

export async function createAgeGroupAction(_prev: AgeGroupFormState, formData: FormData): Promise<AgeGroupFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "ageGroups")) {
    return { message: "You do not have permission to add age groups." };
  }

  const validated = ageGroupInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: fieldErrors(validated.error.issues) };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "ageGroups")) {
    return { message: "You do not have permission to publish directly. Save as draft instead." };
  }

  if (await ageGroupService.isAgeGroupSlugTaken(validated.data.slug)) {
    return { errors: { slug: ["Another age group already uses this address."] } };
  }

  const ageGroup = await ageGroupService.createAgeGroup(validated.data);
  await logAction({ userId: user.id, action: "CREATE", entity: "AgeGroup", entityId: ageGroup._id.toString() });
  revalidateWebsite(ageGroup.slug);
  redirect("/admin/age-groups");
}

export async function updateAgeGroupAction(
  id: string,
  _prev: AgeGroupFormState,
  formData: FormData
): Promise<AgeGroupFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "ageGroups")) {
    return { message: "You do not have permission to edit age groups." };
  }

  const validated = ageGroupInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: fieldErrors(validated.error.issues) };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "ageGroups")) {
    return { message: "You do not have permission to publish directly." };
  }

  if (await ageGroupService.isAgeGroupSlugTaken(validated.data.slug, id)) {
    return { errors: { slug: ["Another age group already uses this address."] } };
  }

  const result = await ageGroupService.updateAgeGroup(id, validated.data);
  if (!result) {
    return { message: "Age group not found." };
  }

  await logAction({ userId: user.id, action: "UPDATE", entity: "AgeGroup", entityId: id });
  revalidateWebsite(result.ageGroup.slug, result.previousSlug);
  redirect("/admin/age-groups");
}

export async function setAgeGroupStatusAction(id: string, status: ContentStatus) {
  const user = await getCurrentUser();
  const action = status === "PUBLISHED" ? "publish" : "update";
  if (!can(user.role, action, "ageGroups")) {
    throw new Error("You do not have permission to change this age group's status.");
  }

  const updated = await ageGroupService.setAgeGroupStatus(id, status);
  await logAction({
    userId: user.id,
    action: status === "PUBLISHED" ? "PUBLISH" : status === "ARCHIVED" ? "ARCHIVE" : "UNPUBLISH",
    entity: "AgeGroup",
    entityId: id,
  });
  revalidateWebsite(updated?.slug);
  revalidatePath("/admin/age-groups", "layout");
}

export async function deleteAgeGroupAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "ageGroups")) {
    throw new Error("You do not have permission to delete age groups.");
  }

  const deleted = await ageGroupService.deleteAgeGroup(id);
  await logAction({ userId: user.id, action: "DELETE", entity: "AgeGroup", entityId: id });
  revalidateWebsite(deleted?.slug);
  redirect("/admin/age-groups");
}

export async function reorderAgeGroupAction(id: string, direction: "up" | "down") {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "ageGroups")) {
    throw new Error("You do not have permission to reorder age groups.");
  }

  await ageGroupService.reorderAgeGroup(id, direction);
  revalidateWebsite();
  revalidatePath("/admin/age-groups");
}

export type SectionHeadingState = { error?: string; saved?: boolean } | undefined;

/** The heading above the homepage's cards, e.g. “Two age groups”. */
export async function updateSectionHeadingAction(_prev: SectionHeadingState, formData: FormData): Promise<SectionHeadingState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "ageGroups")) {
    return { error: "You do not have permission to change the section heading." };
  }

  const heading = str(formData, "heading").trim();
  if (heading.length > 80) return { error: "Up to 80 characters." };

  await updateAgeGroupsHeading(heading, user.id);
  await logAction({ userId: user.id, action: "SETTINGS_UPDATE", entity: "SiteSettings" });
  revalidatePath("/");
  revalidatePath("/admin/age-groups");
  return { saved: true };
}
