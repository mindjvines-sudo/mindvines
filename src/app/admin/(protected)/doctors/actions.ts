"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { doctorInputSchema, type DoctorInput } from "@/validations/doctor.schema";
import * as doctorService from "@/services/doctor.service";
import { logAction } from "@/services/audit.service";
import type { ContentStatus } from "@/lib/constants";

type DoctorFieldErrors = Partial<Record<keyof DoctorInput | `socialLinks.${"facebook" | "x" | "whatsapp"}`, string[]>>;

export type DoctorFormState = {
  errors?: DoctorFieldErrors;
  message?: string;
} | undefined;

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
};

function buildInputFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    designation: formData.get("designation"),
    qualifications: text(formData, "qualifications"),
    experienceYears: text(formData, "experienceYears"),
    bio: text(formData, "bio"),
    photo: text(formData, "photo"),
    socialLinks: {
      facebook: text(formData, "facebook"),
      x: text(formData, "x"),
      whatsapp: text(formData, "whatsapp"),
    },
    status: formData.get("status"),
  };
}

/** Flattens zod issues so nested social-link errors land on their own field. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]): DoctorFieldErrors {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    (errors[key] ??= []).push(issue.message);
  }
  return errors as DoctorFieldErrors;
}

// Doctors appear on the Home and About pages, and in the booking forms on the
// Home and Contact pages.
function revalidateWebsite() {
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
}

export async function createDoctorAction(_prev: DoctorFormState, formData: FormData): Promise<DoctorFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "team")) {
    return { message: "You do not have permission to add doctors." };
  }

  const validated = doctorInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: fieldErrors(validated.error.issues) };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "team")) {
    return { message: "You do not have permission to show doctors on the website directly." };
  }

  const doctor = await doctorService.createDoctor(validated.data);
  await logAction({ userId: user.id, action: "CREATE", entity: "Doctor", entityId: doctor._id.toString() });
  revalidateWebsite();
  redirect("/admin/doctors");
}

export async function updateDoctorAction(
  id: string,
  _prev: DoctorFormState,
  formData: FormData
): Promise<DoctorFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "team")) {
    return { message: "You do not have permission to edit doctors." };
  }

  const validated = doctorInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: fieldErrors(validated.error.issues) };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "team")) {
    return { message: "You do not have permission to show doctors on the website directly." };
  }

  const updated = await doctorService.updateDoctor(id, validated.data);
  if (!updated) {
    return { message: "Doctor not found." };
  }

  await logAction({ userId: user.id, action: "UPDATE", entity: "Doctor", entityId: id });
  revalidateWebsite();
  redirect("/admin/doctors");
}

export async function setDoctorStatusAction(id: string, status: ContentStatus) {
  const user = await getCurrentUser();
  const action = status === "PUBLISHED" ? "publish" : "update";
  if (!can(user.role, action, "team")) {
    throw new Error("You do not have permission to change this doctor's status.");
  }

  await doctorService.setDoctorStatus(id, status);
  await logAction({
    userId: user.id,
    action: status === "PUBLISHED" ? "PUBLISH" : "UNPUBLISH",
    entity: "Doctor",
    entityId: id,
  });
  revalidateWebsite();
  revalidatePath("/admin/doctors");
}

export async function deleteDoctorAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "team")) {
    throw new Error("You do not have permission to delete doctors.");
  }

  await doctorService.deleteDoctor(id);
  await logAction({ userId: user.id, action: "DELETE", entity: "Doctor", entityId: id });
  revalidateWebsite();
  redirect("/admin/doctors");
}

export async function reorderDoctorAction(id: string, direction: "up" | "down") {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "team")) {
    throw new Error("You do not have permission to reorder doctors.");
  }

  await doctorService.reorderDoctor(id, direction);
  revalidateWebsite();
  revalidatePath("/admin/doctors");
}
