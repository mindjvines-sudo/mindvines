import { SITE } from "@/lib/content";

// Brand identity, mirrored from the public site's own SITE object
// (src/lib/content.ts) so sitemap/robots/manifest/SEO fallbacks agree with
// what visitors actually see. Real values should move into SiteSettings
// (admin-editable) once the Settings screen ships; this file stays as the
// build-time fallback for metadata and structured data.
export const siteConfig = {
  name: SITE.name,
  tagline: SITE.tagline,
  description: SITE.description,
  // `metadataBase` (src/app/layout.tsx) resolves every relative OG/Twitter
  // image path against this value, so a missing NEXT_PUBLIC_SITE_URL used to
  // fall back to "http://localhost:3000" — a URL no external crawler
  // (WhatsApp, Facebook, iMessage…) can ever reach, silently killing link
  // previews in production. Falling back to SITE.url instead means a
  // deployment that never got the env var configured still emits the real
  // domain; NEXT_PUBLIC_SITE_URL remains the way to override it (e.g. for a
  // staging deploy on its own subdomain).
  url: process.env.NEXT_PUBLIC_SITE_URL || SITE.url,
  defaultOgImage: "/images/hero-journal.png",
  locale: "en_IN",
} as const;
