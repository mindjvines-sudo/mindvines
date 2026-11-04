"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { settingsInputSchema, type SettingsInput } from "@/validations/settings.schema";
import { updateSiteSettings } from "@/services/settings.service";
import { logAction } from "@/services/audit.service";

export type SettingsFormState = {
  errors?: Partial<Record<keyof SettingsInput, string[]>>;
  message?: string;
  success?: boolean;
} | undefined;

export async function updateSettingsAction(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "settings")) {
    return { message: "You do not have permission to update settings." };
  }

  const validated = settingsInputSchema.safeParse({
    siteName: formData.get("siteName"),
    tagline: formData.get("tagline") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    address: formData.get("address") || undefined,
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  await updateSiteSettings(validated.data, user.id);
  await logAction({ userId: user.id, action: "SETTINGS_UPDATE", entity: "SiteSettings" });
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/contact");

  return { success: true };
}
