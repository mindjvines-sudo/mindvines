import type { Resource } from "@/lib/permissions";

// Public-site navigation lives in components/layout/Header.tsx and MENU in
// @/lib/content. This file defines the admin sidebar.

export type AdminNavGroup = "Customers" | "Website content" | "System";

export type AdminNavItem = { label: string; href: string; resource: Resource; group: AdminNavGroup };

/** Sidebar section order; groups with no visible items are skipped. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = ["Customers", "Website content", "System"];

// `resource` maps to lib/permissions.ts so the admin layout can filter this
// list down to what the signed-in user's role is actually allowed to see.
export const adminNavigation: AdminNavItem[] = [
  { label: "Age Groups", href: "/admin/age-groups", resource: "ageGroups", group: "Website content" },
  { label: "Subscriptions", href: "/admin/subscriptions", resource: "subscriptions", group: "Website content" },
  { label: "Subscribers", href: "/admin/subscribers", resource: "subscribers", group: "Customers" },
  { label: "Enquiries", href: "/admin/enquiries", resource: "enquiries", group: "Customers" },
  { label: "Testimonials", href: "/admin/testimonials", resource: "testimonials", group: "Customers" },
  { label: "Blog", href: "/admin/blog", resource: "blog", group: "Website content" },
  { label: "Media Library", href: "/admin/media", resource: "media", group: "Website content" },
  { label: "Settings", href: "/admin/settings", resource: "settings", group: "System" },
];
