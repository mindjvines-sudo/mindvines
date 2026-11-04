export const ROLES = ["SUPER_ADMIN", "ADMIN", "EDITOR"] as const;
export type Role = (typeof ROLES)[number];

export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const ENQUIRY_STATUSES = [
  "NEW",
  "CONTACTED",
  "IN_PROGRESS",
  "RESOLVED",
  "ARCHIVED",
] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "CREATE",
  "UPDATE",
  "PUBLISH",
  "UNPUBLISH",
  "ARCHIVE",
  "DELETE",
  "MEDIA_UPLOAD",
  "MEDIA_DELETE",
  "USER_CREATE",
  "USER_UPDATE",
  "SETTINGS_UPDATE",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const SESSION_COOKIE_NAME = "session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_PAGE_SIZE = 20;
