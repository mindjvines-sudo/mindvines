import { AlertIcon, CheckCircleIcon, InfoIcon } from "@/components/admin/icons";
import { cn } from "@/lib/utils";

/** Shown in place of a list or table that has nothing to show. */
export function EmptyState({
  icon: Icon = InfoIcon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-8 ring-primary-50/50">
        <Icon className="size-6" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const ALERT_TONES = {
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: CheckCircleIcon },
  error: { box: "border-red-200 bg-red-50 text-red-700", icon: AlertIcon },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-800", icon: AlertIcon },
  info: { box: "border-sky-200 bg-sky-50 text-sky-800", icon: InfoIcon },
} as const;

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof ALERT_TONES;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const { box, icon: Icon } = ALERT_TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", box, className)}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

/** Placeholder block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}
