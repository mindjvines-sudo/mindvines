import type { Resource } from "@/lib/permissions";

// Public-site navigation lives in components/layout/Header.tsx and MENU in
// @/lib/content. This file defines the admin sidebar.

export type AdminNavGroup = "Patient care" | "Website content" | "System";

export type AdminNavItem = { label: string; href: string; resource: Resource; group: AdminNavGroup };

/** Sidebar section order; groups with no visible items are skipped. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = ["Patient care", "Website content", "System"];

// `resource` maps to lib/permissions.ts so the admin layout can filter this
// list down to what the signed-in user's role is actually allowed to see.
export const adminNavigation: AdminNavItem[] = [
  { label: "Subscriptions", href: "/admin/subscriptions", resource: "subscriptions", group: "Website content" },
  { label: "Enquiries", href: "/admin/enquiries", resource: "enquiries", group: "Patient care" },
  { label: "Testimonials", href: "/admin/testimonials", resource: "testimonials", group: "Patient care" },
  { label: "Doctors", href: "/admin/doctors", resource: "team", group: "Website content" },
  { label: "Services", href: "/admin/services", resource: "services", group: "Website content" },
  { label: "Locations", href: "/admin/locations", resource: "locations", group: "Website content" },
  { label: "Blog", href: "/admin/blog", resource: "blog", group: "Website content" },
  { label: "Media Library", href: "/admin/media", resource: "media", group: "Website content" },
  { label: "Settings", href: "/admin/settings", resource: "settings", group: "System" },
];
// export const adminNavigation: AdminNavItem[] = [
//   { label: "Pages", href: "/admin/pages", resource: "pages" },
//   { label: "Services", href: "/admin/services", resource: "services" },
//   { label: "Projects", href: "/admin/projects", resource: "projects" },
//   { label: "Blog", href: "/admin/blog", resource: "blog" },
//   { label: "Categories", href: "/admin/categories", resource: "categories" },
//   { label: "Tags", href: "/admin/tags", resource: "tags" },
//   { label: "FAQs", href: "/admin/faqs", resource: "faqs" },
//   { label: "Testimonials", href: "/admin/testimonials", resource: "testimonials" },
//   { label: "Team", href: "/admin/team", resource: "team" },
//   { label: "Media", href: "/admin/media", resource: "media" },
//   { label: "Enquiries", href: "/admin/enquiries", resource: "enquiries" },
//   { label: "Users", href: "/admin/users", resource: "users" },
//   { label: "Redirects", href: "/admin/redirects", resource: "redirects" },
//   { label: "Settings", href: "/admin/settings", resource: "settings" },
//   { label: "Audit Logs", href: "/admin/audit-logs", resource: "auditLogs" },
// ];
