/**
 * The page builder's section catalogue, free of the database and of any
 * sanitising code so the editor (browser) and the server share one set of
 * types, labels and defaults. What is actually *stored* is validated and
 * sanitised by `sections.schema.ts`; nothing here is trusted on its own.
 */

import type { ComponentKey } from "@/lib/cms/components";

export const SECTION_TYPES = ["hero", "richText", "textImage", "gallery", "video", "features", "stats", "faq", "cta", "contactInfo", "html", "spacer", "component"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_LABELS: Record<SectionType, { label: string; hint: string }> = {
  hero: { label: "Hero", hint: "Large heading with image and buttons" },
  richText: { label: "Text", hint: "Formatted text: headings, lists, links" },
  textImage: { label: "Text + image", hint: "Text beside a picture" },
  gallery: { label: "Image gallery", hint: "A grid of pictures" },
  video: { label: "Video", hint: "YouTube, Vimeo or an uploaded video" },
  features: { label: "Features", hint: "Cards for features, vision, mission or steps" },
  stats: { label: "Statistics", hint: "Big numbers with labels" },
  faq: { label: "FAQ", hint: "Questions and answers" },
  cta: { label: "Call to action", hint: "A message with buttons" },
  contactInfo: { label: "Contact information", hint: "Email, phone, address" },
  html: { label: "Custom HTML", hint: "Basic HTML only; scripts are removed" },
  spacer: { label: "Spacer / divider", hint: "Empty space or a line" },
  component: { label: "Built-in component", hint: "A ready-made section of the site" },
};

export const BACKGROUNDS = ["none", "cream", "tan", "ink"] as const;
export type Background = (typeof BACKGROUNDS)[number];
export const BACKGROUND_LABELS: Record<Background, string> = { none: "White", cream: "Cream", tan: "Tan", ink: "Dark" };
export const PADDINGS = ["none", "sm", "md", "lg"] as const;
export type Padding = (typeof PADDINGS)[number];
export const ALIGNS = ["left", "center"] as const;
export type Align = (typeof ALIGNS)[number];
export const DEVICE_VISIBILITY = ["all", "desktop", "mobile"] as const;
export type DeviceVisibility = (typeof DEVICE_VISIBILITY)[number];
export const DEVICE_VISIBILITY_LABELS: Record<DeviceVisibility, string> = { all: "All devices", desktop: "Desktop and tablet only", mobile: "Mobile only" };

export type Button = { text: string; url: string };
export type ImageRef = { url: string; alt: string };

/** Look and layout, common to every section. */
export type SectionStyle = {
  background: Background;
  align: Align;
  padding: Padding;
  /** Which screens show the section. */
  devices: DeviceVisibility;
  /** Text + image: which side the picture is on (desktop), and whether it comes first on a phone. */
  imageSide: "left" | "right";
  mobileImageFirst: boolean;
  columns: 2 | 3 | 4;
};

export type SectionData = {
  hero: { heading: string; subheading: string; description: string; image: ImageRef; buttons: Button[] };
  richText: { heading: string; html: string };
  textImage: { heading: string; subheading: string; text: string; image: ImageRef; buttons: Button[] };
  gallery: { heading: string; description: string; images: ImageRef[] };
  video: { heading: string; description: string; url: string };
  features: { heading: string; subheading: string; items: { title: string; text: string; icon: string }[] };
  stats: { heading: string; items: { value: string; label: string }[] };
  faq: { heading: string; items: { question: string; answer: string }[] };
  cta: { heading: string; description: string; buttons: Button[] };
  contactInfo: { heading: string; description: string; email: string; phone: string; address: string; hours: string };
  html: { html: string };
  spacer: { size: "sm" | "md" | "lg"; divider: boolean };
  /** One of the site's built-in components (see components.ts), with its editable content. */
  component: { component: ComponentKey; props: Record<string, unknown> };
};

export type Section<T extends SectionType = SectionType> = {
  id: string;
  type: T;
  visible: boolean;
  style: SectionStyle;
  data: SectionData[T];
};
export type AnySection = { [T in SectionType]: Section<T> }[SectionType];

const emptyImage: ImageRef = { url: "", alt: "" };

export const DEFAULT_STYLE: SectionStyle = { background: "none", align: "left", padding: "md", devices: "all", imageSide: "right", mobileImageFirst: false, columns: 3 };

export const DEFAULT_DATA: { [T in SectionType]: SectionData[T] } = {
  hero: { heading: "A heading that says it all", subheading: "", description: "", image: emptyImage, buttons: [] },
  richText: { heading: "", html: "<p>Write something here.</p>" },
  textImage: { heading: "Heading", subheading: "", text: "Tell your story here.", image: emptyImage, buttons: [] },
  gallery: { heading: "", description: "", images: [] },
  video: { heading: "", description: "", url: "" },
  features: { heading: "What makes it special", subheading: "", items: [{ title: "First", text: "Describe it.", icon: "✨" }, { title: "Second", text: "Describe it.", icon: "📖" }, { title: "Third", text: "Describe it.", icon: "🎨" }] },
  stats: { heading: "", items: [{ value: "100+", label: "Children" }, { value: "3", label: "Cities" }] },
  faq: { heading: "Questions", items: [{ question: "A question?", answer: "An answer." }] },
  cta: { heading: "Ready to join?", description: "", buttons: [{ text: "Get started", url: "/subscriptions" }] },
  contactInfo: { heading: "Get in touch", description: "", email: "", phone: "", address: "", hours: "" },
  html: { html: "<p>Custom content</p>" },
  spacer: { size: "md", divider: false },
  component: { component: "faq", props: {} },
};

/** A fresh section with a collision-proof id, filled with starter content. */
export function newSection<T extends SectionType>(type: T, id: string): Section<T> {
  return { id, type, visible: true, style: { ...DEFAULT_STYLE, ...(type === "hero" ? { background: "cream" as const, padding: "lg" as const } : {}) }, data: structuredClone(DEFAULT_DATA[type]) };
}

/** The editable page content: what a draft and a version hold. */
export type PageTemplate = "DEFAULT" | "NARROW" | "LANDING";
export const PAGE_TEMPLATES: PageTemplate[] = ["DEFAULT", "NARROW", "LANDING"];
export const PAGE_TEMPLATE_LABELS: Record<PageTemplate, string> = {
  DEFAULT: "Standard: full-width sections",
  NARROW: "Narrow: reading column",
  LANDING: "Landing: no extra spacing around the sections",
};

export type SeoContent = {
  title: string;
  description: string;
  keywords: string[];
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  /** Search engines may index the page. */
  index: boolean;
  /** Listed in the sitemap. */
  sitemap: boolean;
};

export type PageContent = {
  title: string;
  slug: string;
  template: PageTemplate;
  description: string;
  featuredImage: string;
  seo: SeoContent;
  sections: AnySection[];
};

export const EMPTY_SEO: SeoContent = { title: "", description: "", keywords: [], canonical: "", ogTitle: "", ogDescription: "", ogImage: "", index: true, sitemap: true };

/** The kinds of section an admin adds from the palette: everything except built-in components, which have their own list. */
export const PALETTE_TYPES = SECTION_TYPES.filter((type) => type !== "component");
