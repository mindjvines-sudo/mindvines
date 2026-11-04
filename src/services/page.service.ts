import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { Page, type PageDocument } from "@/models/Page";
import { getPagination, totalPages, startOfMonth } from "@/lib/utils";
import type { ContentStatus } from "@/lib/constants";
import type { PageInput } from "@/validations/page.schema";

export type PageListItem = Pick<
  PageDocument,
  "title" | "slug" | "status" | "publishedAt" | "updatedAt"
> & { id: string };

// --- Admin queries: any status, paginated, no public/DRAFT filtering ---

export async function listPagesAdmin(params: {
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
  const [published, draft, publishedThisMonth, draftThisMonth] = await Promise.all([
    Page.countDocuments({ status: "PUBLISHED" }),
    Page.countDocuments({ status: "DRAFT" }),
    Page.countDocuments({ status: "PUBLISHED", createdAt: { $gte: since } }),
    Page.countDocuments({ status: "DRAFT", createdAt: { $gte: since } }),
  ]);
  return { published, draft, publishedThisMonth, draftThisMonth };
}

export async function getPageByIdAdmin(id: string) {
  await connectToDatabase();
  return Page.findById(id).lean();
}

// --- Public query: published only, never exposes createdBy/updatedBy ---

export async function getPublishedPageBySlug(slug: string) {
  await connectToDatabase();
  const page = await Page.findOne({
    slug,
    status: "PUBLISHED",
    publishedAt: { $lte: new Date() },
  })
    .select("-createdBy -updatedBy")
    .lean();

  return page;
}

export async function listPublishedPages() {
  await connectToDatabase();
  return Page.find({ status: "PUBLISHED", publishedAt: { $lte: new Date() } })
    .select("slug updatedAt")
    .lean();
}

// --- Mutations ---

export async function createPage(input: PageInput, userId: string) {
  await connectToDatabase();
  const publishedAt = input.status === "PUBLISHED" ? new Date() : undefined;

  return Page.create({
    ...input,
    publishedAt,
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function updatePage(id: string, input: PageInput, userId: string) {
  await connectToDatabase();
  const existing = await Page.findById(id);
  if (!existing) return null;

  const becamePublished = input.status === "PUBLISHED" && existing.status !== "PUBLISHED";

  existing.set({
    ...input,
    publishedAt: becamePublished ? new Date() : existing.publishedAt,
    updatedBy: userId,
  });

  await existing.save();
  return existing;
}

export async function setPageStatus(id: string, status: ContentStatus, userId: string) {
  await connectToDatabase();
  const existing = await Page.findById(id);
  if (!existing) return null;

  existing.set({
    status,
    updatedBy: userId,
    publishedAt: status === "PUBLISHED" ? new Date() : existing.publishedAt,
  });

  await existing.save();
  return existing;
}

export async function deletePage(id: string) {
  await connectToDatabase();
  return Page.findByIdAndDelete(id);
}
