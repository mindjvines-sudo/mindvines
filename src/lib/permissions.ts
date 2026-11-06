import { Role } from "@/lib/constants";

export const RESOURCES = [
  "subscriptions",
  "pages",
  "ageGroups",
  "projects",
  "blog",
  "categories",
  "tags",
  "faqs",
  "testimonials",
  "topics",
  "programmes",
  "media",
  "enquiries",
  "subscribers",
  "users",
  "redirects",
  "settings",
  "auditLogs",
] as const;
export type Resource = (typeof RESOURCES)[number];

export type Action = "create" | "read" | "update" | "delete" | "publish";

const CONTENT_RESOURCES: Resource[] = [
  "pages",
  "ageGroups",
  "projects",
  "blog",
  "categories",
  "tags",
  "faqs",
  "testimonials",
  "topics",
  "programmes",
];

// SUPER_ADMIN implicitly has every permission (short-circuited in `can()`).
// ADMIN manages all content/media/enquiries/settings but not users or audit logs.
// EDITOR can create/edit/read drafts, but cannot publish or delete — matches
// spec §11: "Submit content for publishing" rather than publishing directly.
const MATRIX: Record<Exclude<Role, "SUPER_ADMIN">, Partial<Record<Resource, Action[]>>> = {
  ADMIN: {
    subscriptions: ["create", "read", "update", "delete", "publish"],
    ...Object.fromEntries(
      CONTENT_RESOURCES.map((resource) => [resource, ["create", "read", "update", "delete", "publish"]])
    ),
    media: ["create", "read", "update", "delete"],
    enquiries: ["read", "update", "delete"],
    // Paying customers: view, search, export and cancel. Payments themselves are never edited here.
    subscribers: ["read", "update"],
    redirects: ["create", "read", "update", "delete"],
    settings: ["read", "update"],
  },
  EDITOR: {
    ...Object.fromEntries(CONTENT_RESOURCES.map((resource) => [resource, ["create", "read", "update"]])),
    media: ["create", "read"],
    enquiries: ["read"],
  },
};

export function can(role: Role, action: Action, resource: Resource): boolean {
  if (role === "SUPER_ADMIN") return true;
  const allowed = MATRIX[role]?.[resource];
  return allowed?.includes(action) ?? false;
}
