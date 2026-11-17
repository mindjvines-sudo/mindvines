import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { siteConfig } from "@/config/site";
import { DEFAULT_SUBSCRIBER_NOTIFICATION_EMAIL } from "@/config/email";
import type { MenuConfigItem } from "@/lib/content";
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
    subscriberNotificationEmail: "",
    contactPhone: "",
    address: "",
  };
}

/** Blank or missing settings always use the subscriber alert inbox. */
export async function getSubscriberNotificationEmail() {
  await connectToDatabase();
  const settings = await SiteSettings.findOne().select("subscriberNotificationEmail").lean();
  return settings?.subscriberNotificationEmail?.trim() || DEFAULT_SUBSCRIBER_NOTIFICATION_EMAIL;
}

/** The heading above the homepage's age group cards; empty means the built-in one. */
export async function getAgeGroupsHeading() {
  await connectToDatabase();
  const settings = await SiteSettings.findOne().select("ageGroupsHeading").lean();
  return settings?.ageGroupsHeading ?? "";
}

export async function updateAgeGroupsHeading(heading: string, userId: string) {
  await connectToDatabase();
  return SiteSettings.findOneAndUpdate(
    {},
    // The settings document may not exist yet; it needs a site name when created.
    { $set: { ageGroupsHeading: heading, updatedBy: userId }, $setOnInsert: { siteName: siteConfig.name, tagline: siteConfig.tagline } },
    { new: true, upsert: true }
  );
}

export async function updateSiteSettings(input: SettingsInput, userId: string) {
  await connectToDatabase();
  return SiteSettings.findOneAndUpdate(
    {},
    { ...input, updatedBy: userId },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

/** The saved header menu, or undefined for the built-in one. */
export async function getMenuConfig(): Promise<MenuConfigItem[] | undefined> {
  await connectToDatabase();
  const settings = await SiteSettings.findOne().select("menuItems").lean();
  const items = settings?.menuItems;
  return items && items.length > 0 ? items.map((item) => ({ kind: item.kind ?? "link", label: item.label, href: item.href ?? "", hidden: item.hidden ?? false })) : undefined;
}

/** An empty list restores the built-in menu. */
export async function saveMenuConfig(items: MenuConfigItem[], userId: string) {
  await connectToDatabase();
  return SiteSettings.findOneAndUpdate(
    {},
    { $set: { menuItems: items, updatedBy: userId }, $setOnInsert: { siteName: siteConfig.name, tagline: siteConfig.tagline } },
    { new: true, upsert: true }
  );
}
