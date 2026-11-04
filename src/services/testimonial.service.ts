import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { Testimonial } from "@/models/Testimonial";
import { getPagination, totalPages, startOfMonth } from "@/lib/utils";
import type { ContentStatus } from "@/lib/constants";
import type { TestimonialInput } from "@/validations/testimonial.schema";

export async function listTestimonialsAdmin(params: {
  page?: string | number;
  limit?: string | number;
  status?: ContentStatus;
  search?: string;
}) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.search) filter.authorName = { $regex: params.search, $options: "i" };

  const [items, count] = await Promise.all([
    Testimonial.find(filter).populate("image").sort({ displayOrder: 1 }).skip(skip).limit(limit).lean(),
    Testimonial.countDocuments(filter),
  ]);

  return { items, page, limit, total: count, pages: totalPages(count, limit) };
}

export async function getTestimonialByIdAdmin(id: string) {
  await connectToDatabase();
  return Testimonial.findById(id).populate("image").lean();
}

export async function listActiveTestimonials(limit = 10) {
  await connectToDatabase();
  return Testimonial.find({ status: "PUBLISHED" })
    .populate("image")
    .sort({ displayOrder: 1 })
    .limit(limit)
    .lean();
}

export async function createTestimonial(input: TestimonialInput) {
  await connectToDatabase();
  const count = await Testimonial.countDocuments();

  return Testimonial.create({
    ...input,
    image: input.image || undefined,
    displayOrder: count,
  });
}

export async function updateTestimonial(id: string, input: TestimonialInput) {
  await connectToDatabase();
  return Testimonial.findByIdAndUpdate(id, { ...input, image: input.image || undefined }, { new: true });
}

export async function setTestimonialStatus(id: string, status: ContentStatus) {
  await connectToDatabase();
  return Testimonial.findByIdAndUpdate(id, { status }, { new: true });
}

export async function deleteTestimonial(id: string) {
  await connectToDatabase();
  return Testimonial.findByIdAndDelete(id);
}

export async function reorderTestimonial(id: string, direction: "up" | "down") {
  await connectToDatabase();
  const items = await Testimonial.find().sort({ displayOrder: 1 });
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

export async function getTestimonialStats() {
  await connectToDatabase();
  const since = startOfMonth();
  const [active, total, totalThisMonth, activeThisMonth] = await Promise.all([
    Testimonial.countDocuments({ status: "PUBLISHED" }),
    Testimonial.countDocuments(),
    Testimonial.countDocuments({ createdAt: { $gte: since } }),
    Testimonial.countDocuments({ status: "PUBLISHED", updatedAt: { $gte: since } }),
  ]);
  return { active, total, totalThisMonth, activeThisMonth };
}
