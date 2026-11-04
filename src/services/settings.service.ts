import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { siteConfig } from "@/config/site";
import type { SettingsInput } from "@/validations/settings.schema";

export async function getSiteSettings() {
  await connectToDatabase();
  const settings = await SiteSettings.findOne().lean();
  if (settings) return settings;

  // No settings document yet — fall back to the build-time config so the
  // form has sensible starting values instead of appearing empty.
  return {
    siteName: siteConfig.name,
    tagline: siteConfig.tagline,
    contactEmail: "",
    contactPhone: "",
    address: "",
  };
}

export async function updateSiteSettings(input: SettingsInput, userId: string) {
  await connectToDatabase();
  return SiteSettings.findOneAndUpdate(
    {},
    { ...input, updatedBy: userId },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}
