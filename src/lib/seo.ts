import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export type SeoFields = {
  title?: string | null;
  description?: string | null;
  canonical?: string | null;
  keywords?: string[] | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  robots?: string | null;
};

/**
 * Maps a content entity's `seo` subdocument (plus sensible fallbacks) to a
 * Next.js Metadata object. Every indexable public page should build its
 * `generateMetadata()` return value through this function so titles,
 * canonicals, and OG tags stay consistent across the site.
 */
export function buildMetadata(fields: SeoFields, fallback: { title: string; description?: string }): Metadata {
  const title = fields.title || fallback.title;
  const description = fields.description || fallback.description;
  const canonical = fields.canonical || undefined;
  const ogImage = fields.ogImage || siteConfig.defaultOgImage;

  return {
    title,
    description,
    keywords: fields.keywords ?? undefined,
    alternates: canonical ? { canonical } : undefined,
    robots: fields.robots ?? undefined,
    openGraph: {
      title: fields.ogTitle || title,
      description: fields.ogDescription || description,
      images: ogImage ? [{ url: ogImage }] : undefined,
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary_large_image",
      title: fields.ogTitle || title,
      description: fields.ogDescription || description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}
