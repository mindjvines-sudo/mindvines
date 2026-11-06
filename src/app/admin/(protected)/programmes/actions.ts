"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { programmeInputSchema, type ProgrammeInput } from "@/validations/programme.schema";
import * as programmes from "@/services/programme.service";
import { logAction } from "@/services/audit.service";

export type ProgrammeFormState = {
  errors?: Partial<Record<keyof ProgrammeInput, string[]>>;
  message?: string;
} | undefined;

function parseInput(formData: FormData) {
  return programmeInputSchema.safeParse({
    ...Object.fromEntries(formData),
    categories: formData.getAll("categories"),
    active: formData.get("active") === "on",
  });
}

function revalidateProgrammes() {
  revalidatePath("/admin/programmes", "layout");
  revalidatePath("/admin/subscriptions", "layout");
}

export async function createProgrammeAction(_prev: ProgrammeFormState, formData: FormData): Promise<ProgrammeFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "programmes")) return { message: "You do not have permission to add programmes." };
  const result = parseInput(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  try {
    const programme = await programmes.createProgramme(result.data);
    await logAction({ userId: user.id, action: "CREATE", entity: "Programme", entityId: programme._id.toString() });
  } catch {
    return { message: "Unable to save the programme. Please try again." };
  }
  revalidateProgrammes();
  redirect("/admin/programmes");
}

export async function updateProgrammeAction(id: string, _prev: ProgrammeFormState, formData: FormData): Promise<ProgrammeFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "programmes")) return { message: "You do not have permission to edit programmes." };
  const result = parseInput(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  try {
    const programme = await programmes.updateProgramme(id, result.data);
    if (!programme) return { message: "This programme no longer exists." };
    await logAction({ userId: user.id, action: "UPDATE", entity: "Programme", entityId: id });
  } catch {
    return { message: "Unable to save the programme. Please try again." };
  }
  revalidateProgrammes();
  redirect("/admin/programmes");
}

export async function deleteProgrammeAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "programmes")) throw new Error("You do not have permission to delete programmes.");
  const result = await programmes.deleteProgramme(id);
  if (result === "in-use") throw new Error("Plans still belong to this programme. Move them to another programme, or switch this one off instead.");
  if (result === "deleted") await logAction({ userId: user.id, action: "DELETE", entity: "Programme", entityId: id });
  revalidateProgrammes();
}
