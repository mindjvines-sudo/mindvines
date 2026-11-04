import "server-only";
import "@/models/Media";
import { connectToDatabase } from "@/lib/mongodb";
import { Service, type ServiceDocument } from "@/models/Service";
import { getPagination, totalPages } from "@/lib/utils";
import type { ContentStatus } from "@/lib/constants";
import type { ServiceInput } from "@/validations/service.schema";

const PUBLISHED = { status: "PUBLISHED" as const };

/** Card fields for the listing page and the related-services row. */
const CARD_FIELDS = "name slug tagline shortDescription icon image displayOrder";

export async function listServicesAdmin(params: {
  page?: string | number;
  limit?: string | number;
  status?: ContentStatus;
  search?: string;
}) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.search) filter.name = { $regex: params.search, $options: "i" };

  const [items, count] = await Promise.all([
    Service.find(filter)
      .select("name slug shortDescription status image displayOrder updatedAt")
      .populate("image")
      .sort({ displayOrder: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
  ]);

  return { items, page, limit, total: count, pages: totalPages(count, limit) };
}

export async function getServiceStats() {
  await connectToDatabase();
  const [published, draft, total] = await Promise.all([
    Service.countDocuments({ status: "PUBLISHED" }),
    Service.countDocuments({ status: "DRAFT" }),
    Service.countDocuments(),
  ]);
  return { published, draft, archived: Math.max(total - published - draft, 0), total };
}

export async function getServiceByIdAdmin(id: string) {
  await connectToDatabase();
  return Service.findById(id).populate("image").populate("bannerImage").lean();
}

/** True when another service already uses `slug` — slugs are the public URL. */
export async function isServiceSlugTaken(slug: string, excludeId?: string) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { slug };
  if (excludeId) filter._id = { $ne: excludeId };
  return Boolean(await Service.exists(filter));
}

export async function listPublishedServices() {
  await connectToDatabase();
  return Service.find(PUBLISHED).select(CARD_FIELDS).populate("image").sort({ displayOrder: 1 }).lean();
}

export async function getPublishedServiceBySlug(slug: string) {
  await connectToDatabase();
  return Service.findOne({ slug, ...PUBLISHED })
    .populate("image")
    .populate("bannerImage")
    .select("-createdBy -updatedBy")
    .lean();
}

export async function listPublishedServiceSlugs() {
  await connectToDatabase();
  return Service.find(PUBLISHED).select("slug updatedAt").lean();
}

function toDocument(input: ServiceInput) {
  return {
    ...input,
    icon: input.icon || undefined,
    image: input.image || undefined,
    bannerImage: input.bannerImage || undefined,
  } satisfies Partial<Record<keyof ServiceDocument, unknown>>;
}

export async function createService(input: ServiceInput, userId: string) {
  await connectToDatabase();
  // After the highest position, so a new service lands last even after deletes.
  const last = await Service.findOne().sort({ displayOrder: -1 }).select("displayOrder").lean();

  return Service.create({
    ...toDocument(input),
    displayOrder: last ? last.displayOrder + 1 : 0,
    publishedAt: input.status === "PUBLISHED" ? new Date() : undefined,
    createdBy: userId,
    updatedBy: userId,
  });
}

/** Returns the saved service and the slug it had before, so both URLs can be refreshed. */
export async function updateService(id: string, input: ServiceInput, userId: string) {
  await connectToDatabase();
  const existing = await Service.findById(id);
  if (!existing) return null;

  const previousSlug = existing.slug;
  const becamePublished = input.status === "PUBLISHED" && existing.status !== "PUBLISHED";

  // `set` with undefined leaves a field as it was, so emptied optional fields
  // are cleared explicitly.
  existing.set({
    ...toDocument(input),
    publishedAt: becamePublished ? new Date() : existing.publishedAt,
    updatedBy: userId,
  });
  for (const key of ["tagline", "icon", "image", "bannerImage"] as const) {
    if (!input[key]) existing.set(key, undefined);
  }

  await existing.save();
  return { service: existing, previousSlug };
}

export async function setServiceStatus(id: string, status: ContentStatus, userId: string) {
  await connectToDatabase();
  const existing = await Service.findById(id);
  if (!existing) return null;

  existing.set({
    status,
    updatedBy: userId,
    publishedAt: status === "PUBLISHED" && existing.status !== "PUBLISHED" ? new Date() : existing.publishedAt,
  });
  await existing.save();
  return existing;
}

export async function deleteService(id: string) {
  await connectToDatabase();
  return Service.findByIdAndDelete(id);
}

export async function reorderService(id: string, direction: "up" | "down") {
  await connectToDatabase();
  const items = await Service.find().select("displayOrder").sort({ displayOrder: 1 });
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
