import { cn } from "@/lib/utils";

export type Segment = { label: string; value: number; color: string };

/**
 * Donut chart with its total in the middle and a legend beside it. Drawn as
 * stroked circle arcs, so there is no chart dependency.
 */
export function DonutChart({
  segments,
  totalLabel,
  emptyLabel = "No data yet",
}: {
  segments: Segment[];
  totalLabel: string;
  emptyLabel?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  // A small gap between arcs keeps neighbouring colours distinct.
  const gap = segments.filter((s) => s.value > 0).length > 1 ? 3 : 0;

  const visible = segments.filter((s) => s.value > 0);
  const lengths = visible.map((s) => (s.value / total) * circumference);
  const arcs = visible.map((s, i) => ({
    ...s,
    dash: Math.max(lengths[i] - gap, 0.01),
    // Each arc starts where the ones before it end.
    offset: lengths.slice(0, i).reduce((sum, length) => sum + length, 0),
  }));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col">
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img" aria-label={`${totalLabel}: ${total}`}>
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#eef2f6" strokeWidth="14" />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="14"
              strokeDasharray={`${arc.dash} ${circumference}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tabular-nums text-navy-900">{total}</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">{totalLabel}</span>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="grid w-full min-w-0 flex-1 gap-2.5">
          {segments.map((s) => (
            <li key={s.label} className="flex items-center gap-2.5 text-sm">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-slate-600">{s.label}</span>
              <span className="font-medium tabular-nums text-navy-900">{s.value}</span>
              <span className="w-10 text-right text-xs tabular-nums text-slate-400">
                {total ? Math.round((s.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Ranked horizontal bars, labelled above each bar. */
export function BarList({
  items,
  className,
  color = "bg-primary-500",
}: {
  items: { label: string; value: number }[];
  className?: string;
  color?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-slate-600">{item.label}</span>
            <span className="font-medium tabular-nums text-navy-900">{item.value}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="meter"
            aria-label={item.label}
            aria-valuenow={item.value}
            aria-valuemin={0}
            aria-valuemax={max}
          >
            <div className={cn("h-full rounded-full", color)} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
