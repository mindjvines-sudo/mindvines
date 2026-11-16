import { DEFAULT_STYLE, EMPTY_SEO, type AnySection, type PageContent, type PageTemplate, type SeoContent } from "@/lib/cms/sections";

/** The fields of a stored page that make up its live content. */
export type StoredPage = {
  _id?: unknown;
  title: string;
  slug: string;
  content?: string | null;
  excerpt?: string | null;
  featuredImage?: string | null;
  template?: string | null;
  sections?: unknown[] | null;
  seo?: {
    title?: string | null;
    description?: string | null;
    canonical?: string | null;
    keywords?: string[] | null;
    ogTitle?: string | null;
    ogDescription?: string | null;
    ogImage?: string | null;
    robots?: string | null;
  } | null;
  liveMeta?: { sitemap?: boolean } | null;
  draft?: unknown;
};

/** Stored SEO (which has no "index" or "sitemap" switches of its own) as the editor's SEO fields. */
export function seoFromStored(page: Pick<StoredPage, "seo" | "liveMeta">): SeoContent {
  const seo = page.seo ?? {};
  return {
    ...EMPTY_SEO,
    title: seo.title ?? "",
    description: seo.description ?? "",
    keywords: seo.keywords ?? [],
    canonical: seo.canonical ?? "",
    ogTitle: seo.ogTitle ?? "",
    ogDescription: seo.ogDescription ?? "",
    ogImage: seo.ogImage ?? "",
    index: !/noindex/i.test(seo.robots ?? ""),
    sitemap: page.liveMeta?.sitemap !== false,
  };
}

/** The reverse, for storing: `robots` carries the index switch. */
export function seoToStored(seo: SeoContent) {
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    canonical: seo.canonical,
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImage,
    robots: seo.index ? "index, follow" : "noindex, nofollow",
  };
}

/** A page saved before the builder (one HTML body) shown as a single text section. */
export function legacySections(html: string): AnySection[] {
  return html.trim() ? [{ id: "legacy-content", type: "richText", visible: true, style: DEFAULT_STYLE, data: { heading: "", html } }] : [];
}

/** A page's live content as the editor and the renderer see it. */
export function liveContent(page: StoredPage): PageContent {
  const sections = (page.sections ?? []) as AnySection[];
  return {
    title: page.title,
    slug: page.slug,
    template: (page.template as PageTemplate) ?? "DEFAULT",
    description: page.excerpt ?? "",
    featuredImage: page.featuredImage ?? "",
    seo: seoFromStored(page),
    sections: sections.length ? sections : legacySections(page.content ?? ""),
  };
}

/** What the editor opens: the unpublished draft if there is one, else the live content. */
export const editableContent = (page: StoredPage): PageContent => (page.draft ? (page.draft as PageContent) : liveContent(page));
