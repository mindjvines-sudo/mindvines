import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { BlogPost } from "@/models/BlogPost";
import { Category } from "@/models/Category";
import { Tag } from "@/models/Tag";
import type { PopulatedTerm, TermWithCount } from "@/types/blog";

/**
 * Categories and tags are only ever surfaced publicly through the counts of
 * the posts that use them, so both lists are derived from BlogPost rather
 * than read off the taxonomy collections — a term nobody has used yet never
 * shows up as an empty link in the sidebar.
 */
function publishedFilter() {
  return { status: "PUBLISHED" as const, publishedAt: { $lte: new Date() } };
}

export async function listBlogCategories(): Promise<TermWithCount[]> {
  await connectToDatabase();

  return BlogPost.aggregate<TermWithCount>([
    { $match: { ...publishedFilter(), category: { $ne: null } } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    {
      $lookup: {
        from: Category.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "term",
      },
    },
    { $unwind: "$term" },
    { $project: { _id: 0, name: "$term.name", slug: "$term.slug", count: 1 } },
    { $sort: { name: 1 } },
  ]);
}

export async function listBlogTags(): Promise<TermWithCount[]> {
  await connectToDatabase();

  return BlogPost.aggregate<TermWithCount>([
    { $match: publishedFilter() },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    {
      $lookup: {
        from: Tag.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "term",
      },
    },
    { $unwind: "$term" },
    { $project: { _id: 0, name: "$term.name", slug: "$term.slug", count: 1 } },
    // Most-used first: the "Popular Tag" widget is ordered by weight.
    { $sort: { count: -1, name: 1 } },
  ]);
}

/** Resolves a `?category=` / `?tag=` slug to its display name, or null. */
export async function getCategoryBySlug(slug: string): Promise<PopulatedTerm | null> {
  await connectToDatabase();
  return Category.findOne({ slug }).select("name slug").lean<PopulatedTerm>();
}

export async function getTagBySlug(slug: string): Promise<PopulatedTerm | null> {
  await connectToDatabase();
  return Tag.findOne({ slug }).select("name slug").lean<PopulatedTerm>();
}
