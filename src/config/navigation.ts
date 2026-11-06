import type { Resource } from "@/lib/permissions";

// Public-site navigation lives in components/layout/Header.tsx and buildMenu in
// @/lib/content. This file defines the admin sidebar.

export type AdminNavGroup = "Subscription Management" | "Customers" | "Website content" | "System";

/** Sidebar icons, by name (see components/admin/admin-shell). */
export type AdminNavIcon =
  | "registrations" | "active" | "expiring" | "expired" | "pending" | "cancelled"
  | "plans" | "programmes" | "topics" | "enquiries" | "testimonials" | "ageGroups" | "blog" | "media" | "settings";

export type AdminNavItem = { label: string; href: string; resource: Resource; group: AdminNavGroup; icon: AdminNavIcon };

/** Sidebar section order; groups with no visible items are skipped. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = ["Subscription Management", "Customers", "Website content", "System"];

// `resource` maps to lib/permissions.ts so the admin layout can filter this
// list down to what the signed-in user's role is actually allowed to see.
// Entries sharing a page differ by their query (a registration status); the
// sidebar highlights the one matching the current address most closely.
export const adminNavigation: AdminNavItem[] = [
  { label: "All Registrations", href: "/admin/subscribers", resource: "subscribers", group: "Subscription Management", icon: "registrations" },
  { label: "Active Subscriptions", href: "/admin/subscribers?state=ACTIVE", resource: "subscribers", group: "Subscription Management", icon: "active" },
  { label: "Expiring Soon", href: "/admin/subscribers?state=EXPIRING_SOON", resource: "subscribers", group: "Subscription Management", icon: "expiring" },
  { label: "Expired Subscriptions", href: "/admin/subscribers?state=EXPIRED", resource: "subscribers", group: "Subscription Management", icon: "expired" },
  { label: "Pending Payments", href: "/admin/subscribers?state=PENDING_PAYMENT", resource: "subscribers", group: "Subscription Management", icon: "pending" },
  { label: "Cancelled Subscriptions", href: "/admin/subscribers?state=CANCELLED", resource: "subscribers", group: "Subscription Management", icon: "cancelled" },
  { label: "Subscription Plans", href: "/admin/subscriptions", resource: "subscriptions", group: "Subscription Management", icon: "plans" },
  { label: "Programme Management", href: "/admin/programmes", resource: "programmes", group: "Subscription Management", icon: "programmes" },
  { label: "Topic Management", href: "/admin/topics", resource: "topics", group: "Subscription Management", icon: "topics" },
  { label: "Enquiries", href: "/admin/enquiries", resource: "enquiries", group: "Customers", icon: "enquiries" },
  { label: "Testimonials", href: "/admin/testimonials", resource: "testimonials", group: "Customers", icon: "testimonials" },
  { label: "Age Groups", href: "/admin/age-groups", resource: "ageGroups", group: "Website content", icon: "ageGroups" },
  { label: "Blog", href: "/admin/blog", resource: "blog", group: "Website content", icon: "blog" },
  { label: "Media Library", href: "/admin/media", resource: "media", group: "Website content", icon: "media" },
  { label: "Settings", href: "/admin/settings", resource: "settings", group: "System", icon: "settings" },
];

/**
 * The one sidebar entry to highlight: its path matches the current page and
 * every query value in its link matches the current address, preferring the
 * entry with the most such values ("Active Subscriptions" over "All
 * Registrations" on ?state=ACTIVE).
 */
export function activeNavHref(items: { href: string }[], pathname: string, query: URLSearchParams) {
  let best: { href: string; score: number } | null = null;
  for (const item of items) {
    const [path, search = ""] = item.href.split("?");
    if (pathname !== path && !pathname.startsWith(`${path}/`)) continue;
    const wanted = [...new URLSearchParams(search).entries()];
    if (wanted.some(([key, value]) => query.get(key) !== value)) continue;
    if (!best || wanted.length > best.score) best = { href: item.href, score: wanted.length };
  }
  return best?.href ?? null;
}
