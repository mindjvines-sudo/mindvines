import "server-only";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getSystemSeo } from "@/services/cms-page.service";

const cachedSeo = (key: string) => unstable_cache(() => getSystemSeo(key), ["cms-system-seo", key], { revalidate: 300, tags: ["cms-system-seo"] })();

/**
 * A built-in page's own metadata, with whatever an admin has set in the CMS laid
 * over it. Blank fields keep the built-in value, and if the CMS can't be read
 * the page simply keeps its built-in metadata, so SEO edits can never take a
 * page (registration, plans, legal) down.
 */
export async function withSystemSeo(key: string, base: Metadata): Promise<Metadata> {
  let seo;
  try {
    seo = await cachedSeo(key);
  } catch {
    return base;
  }
  if (!seo) return base;

  const title = seo.title || undefined;
  const description = seo.description || undefined;
  const image = seo.ogImage || undefined;
  return {
    ...base,
    ...(title && { title: { absolute: title } }),
    ...(description && { description }),
    ...(seo.keywords.length > 0 && { keywords: seo.keywords }),
    ...(seo.canonical && { alternates: { ...base.alternates, canonical: seo.canonical } }),
    ...(!seo.index && { robots: { index: false, follow: false } }),
    openGraph: {
      ...base.openGraph,
      ...(seo.ogTitle || title ? { title: seo.ogTitle || title } : {}),
      ...(seo.ogDescription || description ? { description: seo.ogDescription || description } : {}),
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      ...base.twitter,
      ...(seo.ogTitle || title ? { title: seo.ogTitle || title } : {}),
      ...(seo.ogDescription || description ? { description: seo.ogDescription || description } : {}),
      ...(image && { images: [image] }),
    },
  };
}
