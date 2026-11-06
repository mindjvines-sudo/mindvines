import "server-only";
import "@/models/Media";
import { connectToDatabase } from "@/lib/mongodb";
import { AgeGroup, AGE_GROUP_IMAGE_PATHS } from "@/models/AgeGroup";
import type { ContentStatus } from "@/lib/constants";
import type { AgeGroupInput } from "@/validations/age-group.schema";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";

/** Single image fields, which must be unset by hand when their picker is cleared. */
const SINGLE_IMAGE_PATHS = ["cardImage", "hero.image", "stats.image"] as const;

export async function listAgeGroupsAdmin(params: { search?: string } = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (params.search) filter.title = { $regex: params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  return AgeGroup.find(filter)
    .select("title slug subtitle status displayOrder updatedAt cardImage")
    .populate("cardImage")
    .sort({ displayOrder: 1 })
    .lean();
}

/** The homepage cards. */
export async function listPublishedAgeGroups() {
  await connectToDatabase();
  return AgeGroup.find({ status: "PUBLISHED" })
    .select("title slug subtitle summary cardImage hero.image updatedAt")
    .populate(["cardImage", "hero.image"])
    .sort({ displayOrder: 1 })
    .lean();
}

export type AgeGroupPageLink = {
  ageGroup: (typeof SUBSCRIPTION_AGE_GROUPS)[number];
  slug: string;
  priceNote: string;
  footnote: string;
};

/**
 * Each subscription age group's published page (the first by display order),
 * youngest first: where the menu links for that age's topics, and the wording
 * its plan band uses under prices and buttons.
 */
export async function listAgeGroupPagesByPlanAge(): Promise<AgeGroupPageLink[]> {
  await connectToDatabase();
  const groups = await AgeGroup.find({ status: "PUBLISHED", "plans.ageGroup": { $in: SUBSCRIPTION_AGE_GROUPS } })
    .select("slug plans.ageGroup plans.priceNote plans.footnote")
    .sort({ displayOrder: 1 })
    .lean();
  return SUBSCRIPTION_AGE_GROUPS.flatMap((ageGroup) => {
    const group = groups.find((item) => item.plans?.ageGroup === ageGroup);
    return group
      ? [{ ageGroup, slug: group.slug, priceNote: group.plans?.priceNote ?? "", footnote: group.plans?.footnote ?? "" }]
      : [];
  });
}

/** The address of the published page whose plan band shows this age group's plans, if there is one. */
export async function getPublishedAgeGroupSlugForPlans(ageGroup: (typeof SUBSCRIPTION_AGE_GROUPS)[number]) {
  await connectToDatabase();
  const group = await AgeGroup.findOne({ status: "PUBLISHED", "plans.ageGroup": ageGroup, "plans.show": { $ne: false } })
    .select("slug")
    .sort({ displayOrder: 1 })
    .lean();
  return group?.slug ?? null;
}

export async function getPublishedAgeGroupBySlug(slug: string) {
  await connectToDatabase();
  return AgeGroup.findOne({ slug, status: "PUBLISHED" }).populate([...AGE_GROUP_IMAGE_PATHS]).lean();
}

export async function getAgeGroupByIdAdmin(id: string) {
  await connectToDatabase();
  return AgeGroup.findById(id).populate([...AGE_GROUP_IMAGE_PATHS]).lean();
}

export async function isAgeGroupSlugTaken(slug: string, excludeId?: string) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { slug };
  if (excludeId) filter._id = { $ne: excludeId };
  return Boolean(await AgeGroup.exists(filter));
}

export async function createAgeGroup(input: AgeGroupInput) {
  await connectToDatabase();
  const last = await AgeGroup.findOne().sort({ displayOrder: -1 }).select("displayOrder").lean();
  return AgeGroup.create({ ...input, displayOrder: last ? last.displayOrder + 1 : 0 });
}

/** Returns the saved age group and its previous slug, so both URLs can be refreshed. */
export async function updateAgeGroup(id: string, input: AgeGroupInput) {
  await connectToDatabase();
  const existing = await AgeGroup.findById(id);
  if (!existing) return null;

  const previousSlug = existing.slug;
  existing.set(input);
  const singleImages = { cardImage: input.cardImage, "hero.image": input.hero.image, "stats.image": input.stats.image };
  for (const path of SINGLE_IMAGE_PATHS) {
    if (!singleImages[path]) existing.set(path, undefined);
  }
  await existing.save();
  return { ageGroup: existing, previousSlug };
}

export async function setAgeGroupStatus(id: string, status: ContentStatus) {
  await connectToDatabase();
  return AgeGroup.findByIdAndUpdate(id, { status }, { new: true });
}

export async function deleteAgeGroup(id: string) {
  await connectToDatabase();
  return AgeGroup.findByIdAndDelete(id);
}

export async function reorderAgeGroup(id: string, direction: "up" | "down") {
  await connectToDatabase();
  const items = await AgeGroup.find().select("displayOrder").sort({ displayOrder: 1 });
  const index = items.findIndex((item) => item._id.toString() === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swapWith = items[swapIndex];
  const currentOrder = current.displayOrder;
  current.displayOrder = swapWith.displayOrder;
  swapWith.displayOrder = currentOrder;
  await Promise.all([current.save(), swapWith.save()]);
}
