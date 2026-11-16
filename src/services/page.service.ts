import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { Page, type PageDocument } from "@/models/Page";
import { getPagination, totalPages, startOfMonth } from "@/lib/utils";

// Page editing lives in cms-page.service.ts. This file keeps the light reads
// the dashboard and global search use. Both skip system-page SEO records,
// which are not pages an admin creates or counts.

export type PageListItem = Pick<PageDocument, "title" | "slug" | "status" | "publishedAt" | "updatedAt"> & { id: string };

export async function listPagesAdmin(params: { page?: string | number; limit?: string | number; search?: string }) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const filter: Record<string, unknown> = { kind: { $ne: "SYSTEM" } };
  if (params.search) filter.title = { $regex: params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [items, count] = await Promise.all([
    Page.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Page.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      slug: item.slug,
      status: item.status,
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
    })) satisfies PageListItem[],
    page,
    limit,
    total: count,
    pages: totalPages(count, limit),
  };
}

export async function getPageStats() {
  await connectToDatabase();
  const since = startOfMonth();
  const cms = { kind: { $ne: "SYSTEM" as const } };
  const [published, draft, publishedThisMonth, draftThisMonth] = await Promise.all([
    Page.countDocuments({ ...cms, status: "PUBLISHED" }),
    Page.countDocuments({ ...cms, status: "DRAFT" }),
    Page.countDocuments({ ...cms, status: "PUBLISHED", createdAt: { $gte: since } }),
    Page.countDocuments({ ...cms, status: "DRAFT", createdAt: { $gte: since } }),
  ]);
  return { published, draft, publishedThisMonth, draftThisMonth };
}
