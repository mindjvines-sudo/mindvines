import "server-only";
import "@/models/Media";
import "@/models/User";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPost, type BlogPostDocument } from "@/models/BlogPost";
import { Category } from "@/models/Category";
import { Tag } from "@/models/Tag";
import { getPagination, totalPages, startOfMonth } from "@/lib/utils";
import type { ContentStatus } from "@/lib/constants";
import type { BlogPostInput } from "@/validations/blog.schema";

const WORDS_PER_MINUTE = 200;

/**
 * What "visible on the public site" means. Scheduled posts (a `publishedAt`
 * in the future) stay hidden until their date passes, so this is re-evaluated
 * per call rather than hoisted to a constant.
 */
function publishedFilter() {
  return { status: "PUBLISHED" as const, publishedAt: { $lte: new Date() } };
}

/** Visitor-supplied search text goes into a RegExp, so neutralise it first. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export async function listBlogPostsAdmin(params: {
  page?: string | number;
  limit?: string | number;
  status?: ContentStatus;
  search?: string;
}) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.search) filter.title = { $regex: params.search, $options: "i" };

  const [items, count] = await Promise.all([
    BlogPost.find(filter)
      .select("title slug status publishedAt updatedAt featuredImage")
      .populate("featuredImage")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BlogPost.countDocuments(filter),
  ]);

  return { items, page, limit, total: count, pages: totalPages(count, limit) };
}

export async function getBlogPostByIdAdmin(id: string) {
  await connectToDatabase();
  return BlogPost.findById(id).populate("featuredImage").lean();
}

export async function getPublishedBlogPostBySlug(slug: string) {
  await connectToDatabase();
  return BlogPost.findOne({ slug, ...publishedFilter() })
    .populate("featuredImage")
    .populate("author", "name")
    .populate("category", "name slug")
    .populate("tags", "name slug")
    .select("-createdBy -updatedBy")
    .lean();
}

/**
 * The previous / next links under a post. Ordered by `publishedAt` to match
 * the listing, falling back to `_id` so posts published in the same second
 * still resolve to a stable neighbour instead of pointing at each other.
 */
export async function getAdjacentBlogPosts(post: {
  _id: Types.ObjectId;
  publishedAt?: Date | null;
}) {
  await connectToDatabase();
  const cursor = post.publishedAt ?? new Date();
  const base = publishedFilter();

  const [previous, next] = await Promise.all([
    BlogPost.findOne({
      ...base,
      $or: [{ publishedAt: { $lt: cursor } }, { publishedAt: cursor, _id: { $lt: post._id } }],
    })
      .select("title slug")
      .sort({ publishedAt: -1, _id: -1 })
      .lean(),
    BlogPost.findOne({
      ...base,
      $or: [{ publishedAt: { $gt: cursor } }, { publishedAt: cursor, _id: { $gt: post._id } }],
    })
      .select("title slug")
      .sort({ publishedAt: 1, _id: 1 })
      .lean(),
  ]);

  return { previous, next };
}

export async function listPublishedBlogPosts(
  params: {
    page?: string | number;
    limit?: string | number;
    /** Slug of a Category — drives `/blog?category=…` and the sidebar list. */
    categorySlug?: string;
    /** Slug of a Tag — drives `/blog?tag=…` and the tag cloud. */
    tagSlug?: string;
    /** Free-text title/excerpt match — drives the sidebar search widget. */
    search?: string;
  } = {}
) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const filter: Record<string, unknown> = publishedFilter();

  if (params.categorySlug) {
    const category = await Category.findOne({ slug: params.categorySlug }).select("_id").lean();
    // An unknown slug must return nothing rather than silently ignoring the
    // filter and showing every post.
    filter.category = category?._id ?? null;
  }

  if (params.tagSlug) {
    const tag = await Tag.findOne({ slug: params.tagSlug }).select("_id").lean();
    filter.tags = tag?._id ?? null;
  }

  if (params.search) {
    const pattern = new RegExp(escapeRegExp(params.search), "i");
    filter.$or = [{ title: pattern }, { excerpt: pattern }];
  }

  const [items, count] = await Promise.all([
    BlogPost.find(filter)
      .populate("featuredImage")
      .populate("author", "name")
      .populate("category", "name slug")
      .select("title slug excerpt featuredImage publishedAt readingTime author category")
      .sort({ publishedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BlogPost.countDocuments(filter),
  ]);

  return { items, page, limit, total: count, pages: totalPages(count, limit) };
}

/** The "Recent Articles" sidebar widget, optionally excluding the open post. */
export async function listRecentPublishedBlogPosts(limit = 3, excludeSlug?: string) {
  await connectToDatabase();
  const filter: Record<string, unknown> = publishedFilter();
  if (excludeSlug) filter.slug = { $ne: excludeSlug };

  return BlogPost.find(filter)
    .populate("featuredImage")
    .select("title slug featuredImage publishedAt")
    .sort({ publishedAt: -1, _id: -1 })
    .limit(limit)
    .lean();
}

export async function listPublishedBlogSlugs() {
  await connectToDatabase();
  return BlogPost.find(publishedFilter())
    .select("slug updatedAt")
    .lean();
}

export async function createBlogPost(input: BlogPostInput, userId: string) {
  await connectToDatabase();
  const publishedAt = input.status === "PUBLISHED" ? new Date() : undefined;

  return BlogPost.create({
    ...input,
    featuredImage: input.featuredImage || undefined,
    readingTime: estimateReadingTime(input.content),
    author: userId,
    publishedAt,
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function updateBlogPost(id: string, input: BlogPostInput, userId: string) {
  await connectToDatabase();
  const existing = await BlogPost.findById(id);
  if (!existing) return null;

  const becamePublished = input.status === "PUBLISHED" && existing.status !== "PUBLISHED";

  existing.set({
    ...input,
    featuredImage: input.featuredImage || undefined,
    readingTime: estimateReadingTime(input.content),
    publishedAt: becamePublished ? new Date() : existing.publishedAt,
    updatedBy: userId,
  });

  await existing.save();
  return existing;
}

export async function setBlogPostStatus(id: string, status: ContentStatus, userId: string) {
  await connectToDatabase();
  const existing = await BlogPost.findById(id);
  if (!existing) return null;

  existing.set({
    status,
    updatedBy: userId,
    publishedAt: status === "PUBLISHED" ? new Date() : existing.publishedAt,
  });

  await existing.save();
  return existing;
}

export async function deleteBlogPost(id: string) {
  await connectToDatabase();
  return BlogPost.findByIdAndDelete(id);
}

export async function getBlogStats() {
  await connectToDatabase();
  const since = startOfMonth();
  const [published, draft, total, totalThisMonth, publishedThisMonth] = await Promise.all([
    BlogPost.countDocuments({ status: "PUBLISHED" }),
    BlogPost.countDocuments({ status: "DRAFT" }),
    BlogPost.countDocuments(),
    BlogPost.countDocuments({ createdAt: { $gte: since } }),
    BlogPost.countDocuments({ status: "PUBLISHED", publishedAt: { $gte: since } }),
  ]);
  return { published, draft, total, totalThisMonth, publishedThisMonth };
}

export async function listRecentBlogPosts(limit = 5) {
  await connectToDatabase();
  return BlogPost.find()
    .select("title status updatedAt featuredImage author")
    .populate("featuredImage")
    .populate("author", "name")
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
}

export type { BlogPostDocument };
