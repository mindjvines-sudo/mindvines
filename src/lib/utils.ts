import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

type ClassValue = string | false | null | undefined;

/** Minimal class joiner — the public site has no need for a full clsx dependency. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getPagination(params: { page?: string | number; limit?: string | number }) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function totalPages(totalItems: number, limit: number): number {
  return Math.max(1, Math.ceil(totalItems / limit));
}

export function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export type TrendStat = { value: number; delta: number };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Post dates render identically on every request and in every timezone, so
 * they are formatted in UTC rather than the server's local zone. `long` is
 * the byline format ("September 12, 2025"); `short` is the sidebar's.
 */
export function formatPostDate(
  value: Date | string | null | undefined,
  style: "long" | "short" = "long",
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    month: style === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** The `datetime` attribute value for a `<time>` element. */
export function toDateTimeAttr(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
