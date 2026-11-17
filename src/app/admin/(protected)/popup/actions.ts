"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PROMO_FREQUENCIES, PROMO_URL_PATTERN } from "@/lib/promo-popup";
import { savePromoPopup } from "@/services/promo-popup.service";
import { logAction } from "@/services/audit.service";

export type PopupState = { error?: string; success?: boolean } | undefined;

const objectId = z.string().trim().regex(/^[a-f\d]{24}$/i, "Choose the image again").or(z.literal(""));
// Dates are typed in Indian time, which is where the audience is.
const istDate = z.string().trim().transform((value, context) => {
  if (!value) return null;
  const date = new Date(`${value}:00+05:30`);
  if (Number.isNaN(date.getTime())) { context.addIssue({ code: "custom", message: "Enter a valid date and time" }); return z.NEVER; }
  return date;
});

const schema = z.object({
  enabled: z.boolean(),
  desktopImage: objectId,
  mobileImage: objectId,
  title: z.string().trim().max(120, "The title is limited to 120 characters"),
  description: z.string().trim().max(400, "The description is limited to 400 characters"),
  ctaLabel: z.string().trim().max(40, "The button text is limited to 40 characters"),
  ctaUrl: z.string().trim().max(300).refine((value) => value === "" || PROMO_URL_PATTERN.test(value), "Start the button link with /, https://, mailto: or tel:"),
  backgroundColor: z.string().trim().regex(/^#[0-9a-f]{6}$/i, "Choose a background colour"),
  overlayOpacity: z.coerce.number().int().min(0).max(90),
  delaySeconds: z.coerce.number().min(0, "The delay can't be negative").max(60, "The delay can be at most 60 seconds"),
  frequency: z.enum(PROMO_FREQUENCIES.map((f) => f.value) as [string, ...string[]]),
  startsAt: istDate,
  endsAt: istDate,
  relaunch: z.boolean(),
});

export async function savePopupAction(_prev: PopupState, formData: FormData): Promise<PopupState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "settings")) return { error: "You do not have permission to change the popup." };

  const get = (name: string) => String(formData.get(name) ?? "");
  const parsed = schema.safeParse({
    enabled: formData.get("enabled") === "on",
    desktopImage: get("desktopImage"), mobileImage: get("mobileImage"),
    title: get("title"), description: get("description"), ctaLabel: get("ctaLabel"), ctaUrl: get("ctaUrl"),
    backgroundColor: get("backgroundColor"), overlayOpacity: get("overlayOpacity"), delaySeconds: get("delaySeconds"),
    frequency: get("frequency"), startsAt: get("startsAt"), endsAt: get("endsAt"), relaunch: formData.get("relaunch") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const d = parsed.data;

  if (d.enabled && !d.desktopImage && !d.mobileImage && !d.title && !d.description) return { error: "Add a banner image or some text before switching the popup on." };
  if (Boolean(d.ctaLabel) !== Boolean(d.ctaUrl) && d.ctaLabel) return { error: "Add a link for the button, or clear the button text." };
  if (d.startsAt && d.endsAt && d.endsAt <= d.startsAt) return { error: "The end date must be after the start date." };

  await savePromoPopup({ ...d, frequency: d.frequency as (typeof PROMO_FREQUENCIES)[number]["value"] }, user.id);
  await logAction({ userId: user.id, action: "SETTINGS_UPDATE", entity: "PromoPopup" });
  revalidatePath("/", "layout");
  return { success: true };
}
