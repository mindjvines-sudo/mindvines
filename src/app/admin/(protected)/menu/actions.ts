"use server";

import { revalidatePath } from "next/cache";
import { menuSchema } from "@/validations/menu.schema";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { saveMenuConfig } from "@/services/settings.service";
import { logAction } from "@/services/audit.service";

export type MenuState = { error?: string; success?: boolean } | undefined;

/** Saves the whole menu in its new order. An empty list restores the built-in menu. */
export async function saveMenuAction(items: unknown): Promise<MenuState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "settings")) return { error: "You do not have permission to change the menu." };
  const parsed = menuSchema.safeParse(items);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the menu." };
  await saveMenuConfig(parsed.data, user.id);
  await logAction({ userId: user.id, action: "SETTINGS_UPDATE", entity: "SiteMenu" });
  revalidatePath("/", "layout");
  return { success: true };
}
