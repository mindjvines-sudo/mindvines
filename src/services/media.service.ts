import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { Media } from "@/models/Media";
import { BlogPost } from "@/models/BlogPost";
import { Testimonial } from "@/models/Testimonial";
import { AgeGroup, AGE_GROUP_IMAGE_PATHS } from "@/models/AgeGroup";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";
import { getPagination, totalPages, startOfMonth } from "@/lib/utils";

export type MediaUsage = { type: "blog" | "testimonial" | "ageGroup"; id: string; title: string };

export class MediaInUseError extends Error {
  usage: MediaUsage[];
  constructor(usage: MediaUsage[]) {
    super("This image is currently being used and cannot be deleted.");
    this.name = "MediaInUseError";
    this.usage = usage;
  }
}

export async function listMediaAdmin(params: { search?: string; page?: string | number; limit?: string | number }) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const filter = params.search
    ? {
        $or: [
          { filename: { $regex: params.search, $options: "i" } },
          { publicId: { $regex: params.search, $options: "i" } },
          { altText: { $regex: params.search, $options: "i" } },
        ],
      }
    : {};

  const [items, count] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Media.countDocuments(filter),
  ]);

  return { items, page, limit, total: count, pages: totalPages(count, limit) };
}

export async function getMediaById(id: string) {
  await connectToDatabase();
  return Media.findById(id).lean();
}

export async function uploadMedia(
  buffer: Buffer,
  meta: { filename: string; folder: string; altText?: string },
  userId: string
) {
  await connectToDatabase();
  const result = await uploadToCloudinary(buffer, { folder: meta.folder });

  return Media.create({
    publicId: result.publicId,
    secureUrl: result.secureUrl,
    resourceType: result.resourceType,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    filename: meta.filename,
    altText: meta.altText,
    folder: meta.folder,
    uploadedBy: userId,
  });
}

export async function updateMediaMetadata(id: string, updates: { altText?: string; caption?: string }) {
  await connectToDatabase();
  return Media.findByIdAndUpdate(id, updates, { new: true }).lean();
}

export async function findMediaUsage(id: string): Promise<MediaUsage[]> {
  await connectToDatabase();
  const [blogPosts, testimonials, ageGroups] = await Promise.all([
    BlogPost.find({ featuredImage: id }).select("title").lean(),
    Testimonial.find({ image: id }).select("authorName").lean(),
    AgeGroup.find({ $or: AGE_GROUP_IMAGE_PATHS.map((path) => ({ [path]: id })) })
      .select("title")
      .lean(),
  ]);

  return [
    ...blogPosts.map((post) => ({ type: "blog" as const, id: post._id.toString(), title: post.title })),
    ...testimonials.map((t) => ({ type: "testimonial" as const, id: t._id.toString(), title: t.authorName })),
    ...ageGroups.map((a) => ({ type: "ageGroup" as const, id: a._id.toString(), title: a.title })),
  ];
}

export async function deleteMedia(id: string): Promise<void> {
  await connectToDatabase();
  const usage = await findMediaUsage(id);
  if (usage.length > 0) {
    throw new MediaInUseError(usage);
  }

  const media = await Media.findById(id);
  if (!media) return;

  await deleteFromCloudinary(media.publicId);
  await Media.findByIdAndDelete(id);
}

export async function getMediaStats() {
  await connectToDatabase();
  const [total, totalThisMonth] = await Promise.all([
    Media.countDocuments(),
    Media.countDocuments({ createdAt: { $gte: startOfMonth() } }),
  ]);
  return { total, totalThisMonth };
}
