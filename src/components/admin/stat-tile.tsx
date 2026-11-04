import Link from "next/link";
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon } from "@/components/admin/icons";
import { cn } from "@/lib/utils";

const COLOR_CLASSES = {
  teal: "bg-primary-50 text-primary-600 ring-primary-100",
  blue: "bg-sky-50 text-sky-600 ring-sky-100",
  violet: "bg-accent-100 text-accent-600 ring-accent-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  slate: "bg-slate-100 text-slate-500 ring-slate-100",
} as const;

export type StatTileColor = keyof typeof COLOR_CLASSES;

/**
 * Dashboard metric card. `compare` sets this period against the previous
 * one and shows the change with an arrow; `note` is a plain supporting line
 * for metrics without a meaningful comparison.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  color = "teal",
  compare,
  note,
  href,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number | string;
  color?: StatTileColor;
  compare?: { current: number; previous: number; period: string };
  note?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-11 items-center justify-center rounded-xl ring-4", COLOR_CLASSES[color])}>
          <Icon className="size-5" />
        </span>
        {href && (
          <ChevronRightIcon className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
        )}
      </div>
      <p className="mt-4 text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[28px] font-semibold leading-9 tracking-[-0.02em] tabular-nums text-navy-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <div className="mt-3 border-t border-line pt-3 text-xs">
        {compare ? <Comparison {...compare} /> : <span className="text-slate-500">{note}</span>}
      </div>
    </>
  );

  const className =
    "group flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card transition-[box-shadow,border-color] duration-200";

  return href ? (
    <Link href={href} className={cn(className, "hover:border-primary-200 hover:shadow-pop")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Comparison({ current, previous, period }: { current: number; previous: number; period: string }) {
  const diff = current - previous;
  if (diff === 0) {
    return <span className="text-slate-500">Same as {period}</span>;
  }
  const up = diff > 0;
  const pct = previous > 0 ? Math.round((Math.abs(diff) / previous) * 100) : null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums",
          up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
        )}
      >
        {up ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
        {pct !== null ? `${pct}%` : `${Math.abs(diff)}`}
      </span>
      <span className="text-slate-500">vs {period}</span>
    </span>
  );
}
