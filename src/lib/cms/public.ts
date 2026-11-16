import "server-only";
import { unstable_cache } from "next/cache";
import { cmsPageTag, CMS_TAG } from "@/lib/cms/revalidate";
import { findRedirect, readPublishedPage, readSystemLayout } from "@/services/cms-page.service";

/**
 * Public reads, cached per address for a minute and dropped at once when an
 * admin publishes, unpublishes or restores (see revalidate.ts). The minute is
 * also the longest a scheduled page can be late.
 */
export const getPublishedPage = (slug: string) =>
  unstable_cache(() => readPublishedPage(slug), ["cms-page", slug], { revalidate: 60, tags: [CMS_TAG, cmsPageTag(slug)] })();

export const getRedirectTarget = (slug: string) =>
  unstable_cache(() => findRedirect(slug), ["cms-redirect", slug], { revalidate: 60, tags: [CMS_TAG, cmsPageTag(slug)] })();

export const cmsSystemTag = (key: string) => `cms-system:${key}`;

/**
 * The published CMS layout of a built-in page, or null when the page should be
 * drawn by its own code: nothing published, unpublished (reverted), or the CMS
 * can't be read. The built-in page is therefore always the fallback.
 */
export async function getSystemLayout(key: string) {
  try {
    return await unstable_cache(() => readSystemLayout(key), ["cms-system-layout", key], { revalidate: 60, tags: [CMS_TAG, cmsSystemTag(key)] })();
  } catch {
    return null;
  }
}
