import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { Doctor } from "@/models/Doctor";
import { getPagination, totalPages } from "@/lib/utils";
import type { ContentStatus } from "@/lib/constants";
import type { DoctorInput } from "@/validations/doctor.schema";

export async function listDoctorsAdmin(params: {
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
    Doctor.find(filter).populate("photo").sort({ displayOrder: 1 }).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);

  return { items, page, limit, total: count, pages: totalPages(count, limit) };
}

export async function getDoctorByIdAdmin(id: string) {
  await connectToDatabase();
  return Doctor.findById(id).populate("photo").lean();
}

export async function listActiveDoctors(limit = 24) {
  await connectToDatabase();
  return Doctor.find({ status: "PUBLISHED" }).populate("photo").sort({ displayOrder: 1 }).limit(limit).lean();
}

export async function createDoctor(input: DoctorInput) {
  await connectToDatabase();
  // After the highest position, not at the count: once a doctor is deleted the
  // count can collide with an existing position, which breaks reordering.
  const last = await Doctor.findOne().sort({ displayOrder: -1 }).select("displayOrder").lean();

  return Doctor.create({
    ...input,
    photo: input.photo || undefined,
    displayOrder: last ? last.displayOrder + 1 : 0,
  });
}

export async function updateDoctor(id: string, input: DoctorInput) {
  await connectToDatabase();
  // `$unset` clears fields the editor emptied; a plain update would leave the
  // old values in place because undefined keys are skipped.
  const unset: Record<string, 1> = {};
  for (const key of ["qualifications", "experienceYears", "bio", "photo"] as const) {
    if (!input[key]) unset[key] = 1;
  }
  for (const key of ["facebook", "x", "whatsapp"] as const) {
    if (!input.socialLinks[key]) unset[`socialLinks.${key}`] = 1;
  }

  const set: Record<string, unknown> = { ...input };
  delete set.socialLinks;
  for (const key of Object.keys(unset)) delete set[key];
  for (const [key, value] of Object.entries(input.socialLinks)) {
    if (value) set[`socialLinks.${key}`] = value;
  }
  if (input.experienceYears === 0) {
    set.experienceYears = 0;
    delete unset.experienceYears;
  }

  return Doctor.findByIdAndUpdate(
    id,
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { new: true }
  );
}

export async function setDoctorStatus(id: string, status: ContentStatus) {
  await connectToDatabase();
  return Doctor.findByIdAndUpdate(id, { status }, { new: true });
}

export async function deleteDoctor(id: string) {
  await connectToDatabase();
  return Doctor.findByIdAndDelete(id);
}

export async function reorderDoctor(id: string, direction: "up" | "down") {
  await connectToDatabase();
  const items = await Doctor.find().sort({ displayOrder: 1 });
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
