import Link from "next/link";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  as: Tag = "section",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={cn("rounded-2xl border border-line bg-white shadow-card", className)}>{children}</Tag>
  );
}

/** Card title row: heading, optional supporting line, and a trailing action or link. */
export function CardHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="flex min-w-[min(100%,240px)] flex-1 items-start gap-3">
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Icon className="size-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-6 text-navy-900">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] leading-5 text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium text-primary-700 transition-colors hover:bg-primary-50"
    >
      {children}
    </Link>
  );
}
