"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { saveMenuConfig } from "@/services/settings.service";
import { logAction } from "@/services/audit.service";

const href = z.string().trim().max(300).refine((value) => value === "" || /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(value), "Start the link with /, #, https:// , mailto: or tel:");

const itemSchema = z.object({
  kind: z.enum(["link", "topics", "plans"]),
  label: z.string().trim().min(1, "Every item needs a name").max(60, "Names are limited to 60 characters"),
  href,
  hidden: z.boolean().optional(),
});
const menuSchema = z.array(itemSchema).max(20, "Up to 20 items");

export type MenuState = { error?: string; success?: boolean } | undefined;

/** Saves the whole menu in its new order. An empty list restores the built-in menu. */
export async function saveMenuAction(items: unknown): Promise<MenuState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "settings")) return { error: "You do not have permission to change the menu." };
  const parsed = menuSchema.safeParse(items);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the menu." };
  const missing = parsed.data.find((item) => item.kind === "link" && !item.href);
  if (missing) return { error: `Add a link for “${missing.label}”.` };

  await saveMenuConfig(parsed.data, user.id);
  await logAction({ userId: user.id, action: "SETTINGS_UPDATE", entity: "SiteMenu" });
  revalidatePath("/", "layout");
  return { success: true };
}
