import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteConfig } from "@/config/site";
import { listPublishedAgeGroups } from "@/services/age-group.service";
import { listSitemapPages } from "@/services/cms-page.service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const ageGroups = await listPublishedAgeGroups().catch(() => []);
  // A CMS outage must never take the rest of the sitemap down.
  const cmsPages = await listSitemapPages().catch(() => []);

  return [
    { url: siteConfig.url, lastModified: new Date() },
    { url: `${siteConfig.url}/subscriptions`, lastModified: new Date() },
    ...["terms", "refund-policy", "privacy-policy"].map((slug) => ({ url: `${siteConfig.url}/${slug}`, lastModified: new Date() })),
    ...cmsPages.map((page) => ({ url: `${siteConfig.url}/${page.slug}`, lastModified: page.updatedAt })),
    ...ageGroups.map((group) => ({ url: `${siteConfig.url}/age-groups/${group.slug}`, lastModified: group.updatedAt })),
  ];
}
