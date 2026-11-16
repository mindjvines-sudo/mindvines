import "server-only";
import { z } from "zod";
import { ALIGNS, BACKGROUNDS, DEFAULT_STYLE, DEVICE_VISIBILITY, PADDINGS, PAGE_TEMPLATES, SECTION_TYPES } from "@/lib/cms/sections";
import { slugProblem } from "@/lib/cms/reserved";
import { safeImage, safeLink, sanitizeHtmlBlock, sanitizeRichHtml, stripTags, videoSource } from "@/lib/cms/sanitize";
import { COMPONENT_KEYS, COMPONENTS } from "@/lib/cms/components";
import { conform } from "@/lib/cms/conform";

/**
 * The only way content enters the database. Parsing does three jobs at once:
 * checks shape and limits, drops unknown fields, and sanitises every string
 * according to what it is (plain text, rich HTML, link, image, video). The
 * browser's own checks are a convenience; these are the real ones.
 */

const text = (max: number) => z.string().max(max).default("").transform(stripTags);

const link = z
  .string()
  .max(2000)
  .default("")
  .superRefine((value, context) => {
    if (safeLink(value) === null) context.addIssue({ code: "custom", message: "Use a page on this site (starting with /), an https:// address, mailto: or tel:" });
  })
  .transform((value) => safeLink(value) ?? "");

const image = z
  .string()
  .max(2000)
  .default("")
  .superRefine((value, context) => {
    if (safeImage(value) === null) context.addIssue({ code: "custom", message: "Choose a picture from the media library" });
  })
  .transform((value) => safeImage(value) ?? "");

const imageRef = z.object({ url: image, alt: text(200) }).default({ url: "", alt: "" });
const button = z.object({ text: text(60), url: link }).refine((value) => value.text || !value.url, { message: "Give the button a label", path: ["text"] });
const buttons = z.array(button).max(3).default([]).transform((list) => list.filter((item) => item.text && item.url));
const rich = z.string().max(100_000).default("").transform(sanitizeRichHtml);
const block = z.string().max(100_000).default("").transform(sanitizeHtmlBlock);

const style = z
  .object({
    background: z.enum(BACKGROUNDS).default(DEFAULT_STYLE.background),
    align: z.enum(ALIGNS).default(DEFAULT_STYLE.align),
    padding: z.enum(PADDINGS).default(DEFAULT_STYLE.padding),
    devices: z.enum(DEVICE_VISIBILITY).default(DEFAULT_STYLE.devices),
    imageSide: z.enum(["left", "right"]).default(DEFAULT_STYLE.imageSide),
    mobileImageFirst: z.boolean().default(DEFAULT_STYLE.mobileImageFirst),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(DEFAULT_STYLE.columns),
  })
  .default(DEFAULT_STYLE);

const video = z
  .string()
  .max(2000)
  .default("")
  .superRefine((value, context) => {
    if (value.trim() && !videoSource(value)) context.addIssue({ code: "custom", message: "Use a YouTube or Vimeo link, or a video from the media library" });
  })
  .transform((value) => (videoSource(value)?.src ?? ""));

const section = <T extends string, D extends z.ZodType>(type: T, data: D) =>
  z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{4,40}$/), type: z.literal(type), visible: z.boolean().default(true), style, data });

const sectionSchema = z.discriminatedUnion("type", [
  section("hero", z.object({ heading: text(160), subheading: text(200), description: text(1000), image: imageRef, buttons })),
  section("richText", z.object({ heading: text(160), html: rich })),
  section("textImage", z.object({ heading: text(160), subheading: text(200), text: text(4000), image: imageRef, buttons })),
  section("gallery", z.object({ heading: text(160), description: text(600), images: z.array(z.object({ url: image, alt: text(200) })).max(30).default([]).transform((list) => list.filter((item) => item.url)) })),
  section("video", z.object({ heading: text(160), description: text(600), url: video })),
  section("features", z.object({ heading: text(160), subheading: text(300), items: z.array(z.object({ title: text(100), text: text(600), icon: text(8) })).max(12).default([]) })),
  section("stats", z.object({ heading: text(160), items: z.array(z.object({ value: text(20), label: text(80) })).max(8).default([]) })),
  section("faq", z.object({ heading: text(160), items: z.array(z.object({ question: text(300), answer: text(3000) })).max(40).default([]) })),
  section("cta", z.object({ heading: text(160), description: text(600), buttons })),
  section("contactInfo", z.object({ heading: text(160), description: text(600), email: text(120), phone: text(40), address: text(300), hours: text(200) })),
  section("html", z.object({ html: block })),
  section("component", z.object({ component: z.enum(COMPONENT_KEYS), props: z.unknown() }).transform((data, context) => {
    const issues: { path: string; message: string }[] = [];
    const props = conform(COMPONENTS[data.component].defaults(), data.props, "props", issues) as Record<string, unknown>;
    if (JSON.stringify(props).length > 250_000) context.addIssue({ code: "custom", message: "This section has too much content" });
    for (const issue of issues) context.addIssue({ code: "custom", path: issue.path.split("."), message: issue.message });
    return { component: data.component, props };
  })),
  section("spacer", z.object({ size: z.enum(["sm", "md", "lg"]).default("md"), divider: z.boolean().default(false) })),
]);

const seoSchema = z
  .object({
    title: text(70),
    description: text(170),
    keywords: z.array(text(60)).max(20).default([]).transform((list) => list.filter(Boolean)),
    canonical: z
      .string()
      .max(500)
      .default("")
      .superRefine((value, context) => {
        if (value.trim() && !/^https:\/\/[^\s]+$/i.test(value.trim())) context.addIssue({ code: "custom", message: "Use a full https:// address" });
      })
      .transform((value) => value.trim()),
    ogTitle: text(90),
    ogDescription: text(200),
    ogImage: image,
    index: z.boolean().default(true),
    sitemap: z.boolean().default(true),
  })
  .default({ title: "", description: "", keywords: [], canonical: "", ogTitle: "", ogDescription: "", ogImage: "", index: true, sitemap: true });

/**
 * A page's editable content: a draft, or the snapshot of a version. A built-in
 * (system) page keeps the address the site gives it, so its slug is not an
 * admin-chosen one and is not checked against the reserved list.
 */
const pageContent = (system: boolean) =>
  z
    .object({
      title: z.string().trim().min(1, "Enter a page title").max(160).transform(stripTags),
      slug: z.string().trim().toLowerCase().default(""),
      template: z.enum(PAGE_TEMPLATES).default("DEFAULT"),
      description: text(300),
      featuredImage: image,
      seo: seoSchema,
      sections: z.array(sectionSchema).max(60, "A page can have up to 60 sections").default([]),
    })
    .superRefine((value, context) => {
      const problem = system ? null : slugProblem(value.slug);
      if (problem) context.addIssue({ code: "custom", path: ["slug"], message: problem });
      const ids = new Set<string>();
      value.sections.forEach((item, index) => {
        if (ids.has(item.id)) context.addIssue({ code: "custom", path: ["sections", index, "id"], message: "Duplicate section" });
        ids.add(item.id);
      });
    });

export const pageContentSchema = pageContent(false);
export const systemContentSchema = pageContent(true);

export type PageContentInput = z.input<typeof pageContentSchema>;
export type ValidPageContent = z.output<typeof pageContentSchema>;

/** SEO only, for system pages whose layout lives in code. */
export const systemSeoSchema = z.object({ seo: seoSchema });

export const SECTION_TYPE_SET = new Set<string>(SECTION_TYPES);
