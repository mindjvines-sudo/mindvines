"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { pilotPlanInputSchema, type PilotPlanInput } from "@/validations/pilot.schema";
import * as pilot from "@/services/pilot.service";
import { logAction } from "@/services/audit.service";

export type PilotFormState = {
  errors?: Partial<Record<keyof PilotPlanInput, string[]>>;
  message?: string;
} | undefined;

function revalidatePilot() {
  revalidatePath("/admin/pilot", "layout");
  revalidatePath("/pilot");
}

function parseInput(formData: FormData) {
  return pilotPlanInputSchema.safeParse(Object.fromEntries(formData));
}

function failure(error: unknown): PilotFormState {
  if (error instanceof pilot.PilotError) {
    if (error.code === "CODE_TAKEN") return { errors: { accessCode: [error.message] } };
    if (error.code === "LIMIT_TOO_LOW") return { errors: { maxRegistrations: [error.message] } };
    return { message: error.message };
  }
  return { message: "Unable to save the pilot plan. Please try again." };
}

export async function createPilotPlanAction(_prev: PilotFormState, formData: FormData): Promise<PilotFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "pilotPlans")) return { message: "You do not have permission to create pilot plans." };
  const result = parseInput(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  try {
    const plan = await pilot.createPilotPlan(result.data, user.id);
    await logAction({ userId: user.id, action: "CREATE", entity: "PilotPlan", entityId: plan._id.toString() });
  } catch (error) {
    return failure(error);
  }
  revalidatePilot();
  redirect("/admin/pilot");
}

export async function updatePilotPlanAction(id: string, _prev: PilotFormState, formData: FormData): Promise<PilotFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "pilotPlans")) return { message: "You do not have permission to edit pilot plans." };
  const result = parseInput(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  try {
    const plan = await pilot.updatePilotPlan(id, result.data, user.id);
    if (!plan) return { message: "This pilot plan no longer exists." };
    await logAction({ userId: user.id, action: "UPDATE", entity: "PilotPlan", entityId: id });
  } catch (error) {
    return failure(error);
  }
  revalidatePilot();
  redirect("/admin/pilot");
}

/** Switches a plan on or off without touching its registrations; an off plan takes no new registrations. */
export async function setPilotPlanStatusAction(id: string, status: "ACTIVE" | "INACTIVE"): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "pilotPlans")) throw new Error("You do not have permission to change pilot plans.");
  const plan = await pilot.setPilotPlanStatus(id, status, user.id);
  if (plan) await logAction({ userId: user.id, action: status === "ACTIVE" ? "PUBLISH" : "UNPUBLISH", entity: "PilotPlan", entityId: id });
  revalidatePilot();
}
