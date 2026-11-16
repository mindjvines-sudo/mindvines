import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

export const CMS_TAG = "cms-pages";
export const cmsPageTag = (slug: string) => `cms-page:${slug}`;

/** Makes a publish, unpublish or restore visible at once: the cached page data, its address, and the sitemap. */
export function revalidateCms(slugs: (string | null | undefined)[]) {
  for (const slug of new Set(slugs.filter((slug): slug is string => Boolean(slug)))) {
    revalidateTag(cmsPageTag(slug), { expire: 0 });
    revalidatePath(`/${slug}`);
  }
  revalidateTag(CMS_TAG, { expire: 0 });
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/pages", "layout");
}

/** SEO of a system page changed: its metadata is read on request, so the page itself is refreshed. */
export function revalidateSystemPage(path: string, key?: string) {
  if (key) revalidateTag(`cms-system:${key}`, { expire: 0 });
  revalidateTag("cms-system-seo", { expire: 0 });
  revalidatePath(path);
  revalidatePath("/admin/pages", "layout");
}
