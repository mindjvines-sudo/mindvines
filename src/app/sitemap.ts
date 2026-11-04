import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteConfig } from "@/config/site";
import { listPublishedAgeGroups } from "@/services/age-group.service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const ageGroups = await listPublishedAgeGroups().catch(() => []);

  return [
    { url: siteConfig.url, lastModified: new Date() },
    { url: `${siteConfig.url}/subscriptions`, lastModified: new Date() },
    ...ageGroups.map((group) => ({ url: `${siteConfig.url}/age-groups/${group.slug}`, lastModified: group.updatedAt })),
  ];
}
