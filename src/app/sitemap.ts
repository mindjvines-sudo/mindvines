import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// The public site is a single scrolling page; its sections are anchors, not routes.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteConfig.url, lastModified: new Date() }];
}
