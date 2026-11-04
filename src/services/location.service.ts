import "server-only";
import "@/models/Media";
import { connectToDatabase } from "@/lib/mongodb";
import { Location } from "@/models/Location";
import type { ContentStatus } from "@/lib/constants";
import type { LocationInput } from "@/validations/location.schema";

const IMAGE_FIELDS = ["approach.image", "bannerImage", "teamImage", "corporateImage"] as const;

export async function listLocationsAdmin(params: { search?: string } = {}) {
  await connectToDatabase();
  const filter: Record<string, unknown> = {};
  if (params.search) filter.name = { $regex: params.search, $options: "i" };
  return Location.find(filter)
    .select("name slug title address status displayOrder updatedAt bannerImage")
    .populate("bannerImage")
    .sort({ displayOrder: 1 })
    .lean();
}

export async function getLocationByIdAdmin(id: string) {
  await connectToDatabase();
  return Location.findById(id).populate([...IMAGE_FIELDS]).lean();
}

export async function isLocationSlugTaken(slug: string, excludeId?: string) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { slug };
  if (excludeId) filter._id = { $ne: excludeId };
  return Boolean(await Location.exists(filter));
}

export async function listPublishedLocations() {
  await connectToDatabase();
  return Location.find({ status: "PUBLISHED" }).populate([...IMAGE_FIELDS]).sort({ displayOrder: 1 }).lean();
}

export async function listPublishedLocationSlugs() {
  await connectToDatabase();
  return Location.find({ status: "PUBLISHED" }).select("slug updatedAt").lean();
}

/** Empty image pickers post "", which must clear the reference rather than store it. */
function toDocument(input: LocationInput) {
  return {
    ...input,
    approach: { ...input.approach, image: input.approach.image || undefined },
    bannerImage: input.bannerImage || undefined,
    teamImage: input.teamImage || undefined,
    corporateImage: input.corporateImage || undefined,
  };
}

export async function createLocation(input: LocationInput) {
  await connectToDatabase();
  const last = await Location.findOne().sort({ displayOrder: -1 }).select("displayOrder").lean();
  return Location.create({ ...toDocument(input), displayOrder: last ? last.displayOrder + 1 : 0 });
}

/** Returns the saved location and its previous slug, so both URLs can be refreshed. */
export async function updateLocation(id: string, input: LocationInput) {
  await connectToDatabase();
  const existing = await Location.findById(id);
  if (!existing) return null;

  const previousSlug = existing.slug;
  existing.set(toDocument(input));
  for (const key of IMAGE_FIELDS) {
    const value = key === "approach.image" ? input.approach.image : input[key];
    if (!value) existing.set(key, undefined);
  }
  await existing.save();
  return { location: existing, previousSlug };
}

export async function setLocationStatus(id: string, status: ContentStatus) {
  await connectToDatabase();
  return Location.findByIdAndUpdate(id, { status }, { new: true });
}

export async function deleteLocation(id: string) {
  await connectToDatabase();
  return Location.findByIdAndDelete(id);
}

export async function reorderLocation(id: string, direction: "up" | "down") {
  await connectToDatabase();
  const items = await Location.find().select("displayOrder").sort({ displayOrder: 1 });
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
