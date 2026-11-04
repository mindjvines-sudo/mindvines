import "server-only";
import "@/models/Media";
import "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPost, type BlogPostDocument } from "@/models/BlogPost";
import "@/models/Category";
import "@/models/Tag";
import { getPagination, totalPages, startOfMonth } from "@/lib/utils";
import type { ContentStatus } from "@/lib/constants";
import type { BlogPostInput } from "@/validations/blog.schema";

const WORDS_PER_MINUTE = 200;

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
