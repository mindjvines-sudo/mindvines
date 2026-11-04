import { cn } from "@/lib/utils";

export type BadgeTone = "teal" | "blue" | "violet" | "amber" | "green" | "red" | "slate";

const TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  teal: { badge: "bg-primary-50 text-primary-700 ring-primary-200/70", dot: "bg-primary-500" },
  blue: { badge: "bg-sky-50 text-sky-700 ring-sky-200/70", dot: "bg-sky-500" },
  violet: { badge: "bg-accent-100 text-accent-600 ring-accent-500/20", dot: "bg-accent-500" },
  amber: { badge: "bg-amber-50 text-amber-700 ring-amber-200/80", dot: "bg-amber-500" },
  green: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200/70", dot: "bg-emerald-500" },
  red: { badge: "bg-red-50 text-red-700 ring-red-200/70", dot: "bg-red-500" },
  slate: { badge: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

export function Badge({
  tone = "slate",
  dot = true,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone].badge,
        className,
      )}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", TONES[tone].dot)} />}
      {children}
    </span>
  );
}

/**
 * Every record status in the admin, in one place. Content statuses keep the
 * labels each screen already used: testimonials and doctors call PUBLISHED
 * "Active".
 */
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  // Content
  PUBLISHED: { label: "Published", tone: "green" },
  DRAFT: { label: "Draft", tone: "amber" },
  ARCHIVED: { label: "Archived", tone: "slate" },
  // Enquiries
  NEW: { label: "New", tone: "blue" },
  CONTACTED: { label: "Contacted", tone: "violet" },
  IN_PROGRESS: { label: "In progress", tone: "amber" },
  RESOLVED: { label: "Resolved", tone: "green" },
};

const ACTIVE_LABELS: Record<string, string> = { PUBLISHED: "Active", DRAFT: "Inactive", ARCHIVED: "Archived" };

export type StatusKind = "content" | "testimonial" | "doctor" | "enquiry";

export function statusLabel(status: string, kind: StatusKind = "content") {
  if (kind === "testimonial" || kind === "doctor") return ACTIVE_LABELS[status] ?? status;
  return STATUS[status]?.label ?? status.replace(/_/g, " ").toLowerCase();
}

export function StatusBadge({
  status,
  kind = "content",
}: {
  status: string;
  kind?: StatusKind;
}) {
  return <Badge tone={STATUS[status]?.tone ?? "slate"}>{statusLabel(status, kind)}</Badge>;
}
