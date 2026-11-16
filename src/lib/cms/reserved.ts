/** Single-segment addresses already owned by the application. A CMS page can never take one, or its slug would be unreachable (or worse, shadow a real route). */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "checkout", "renew", "subscriptions", "pilot", "age-groups", "terms", "privacy-policy", "refund-policy",
  "sitemap.xml", "robots.txt", "manifest.webmanifest", "favicon.ico", "icon", "apple-icon", "_next", "media", "login", "logout",
  "not-found", "preview", "contact", "about", "blog", "static", "public", "images", "assets",
]);

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugProblem(slug: string): string | null {
  if (!slug) return "Enter a page address.";
  if (slug.length > 80) return "Keep the address under 80 characters.";
  if (!SLUG_PATTERN.test(slug)) return "Use lowercase letters, numbers and single hyphens only.";
  if (RESERVED_SLUGS.has(slug)) return `“${slug}” is used by the website itself. Please choose another address.`;
  return null;
}

/** Pages that exist in code. Their layouts stay there; the CMS lists them and manages their SEO. */
export const SYSTEM_PAGES = [
  { key: "home", title: "Home", path: "/", editHref: "/admin/age-groups", editLabel: "Age groups & homepage sections" },
  { key: "subscriptions", title: "Subscription plans", path: "/subscriptions", editHref: "/admin/subscriptions", editLabel: "Subscription plans" },
  { key: "pilot", title: "Pilot registration", path: "/pilot", editHref: "/admin/pilot", editLabel: "Pilot plans" },
  { key: "renew", title: "Renew a subscription", path: "/renew", editHref: null, editLabel: null },
  { key: "terms", title: "Terms & conditions", path: "/terms", editHref: null, editLabel: null },
  { key: "refund-policy", title: "Refund policy", path: "/refund-policy", editHref: null, editLabel: null },
  { key: "privacy-policy", title: "Privacy policy", path: "/privacy-policy", editHref: null, editLabel: null },
] as const;
export type SystemPageKey = (typeof SYSTEM_PAGES)[number]["key"];
export const systemPage = (key: string) => SYSTEM_PAGES.find((page) => page.key === key);
