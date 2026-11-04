import { cn } from "@/lib/utils";

/**
 * Table primitives. Wide tables scroll sideways inside their card on small
 * screens rather than squeezing columns; columns marked `hideBelow` drop
 * out entirely on narrow viewports.
 */
export function Table({
  children,
  className,
  minWidth = 640,
}: {
  children: React.ReactNode;
  className?: string;
  /** Below this width the table scrolls sideways instead of squeezing. */
  minWidth?: number;
}) {
  return (
    // `relative` keeps visually hidden (absolutely positioned) labels inside
    // the scroller instead of widening the page.
    <div className="relative overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-sm", className)} style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-y border-line bg-slate-50/70 text-xs font-medium uppercase tracking-[0.04em] text-slate-500">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

const HIDE = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" } as const;

export function Th({
  children,
  className,
  align = "left",
  hideBelow,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  hideBelow?: keyof typeof HIDE;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "h-11 px-4 font-medium first:pl-5 last:pr-5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        hideBelow && HIDE[hideBelow],
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-slate-50/80", className)}>{children}</tr>;
}

export function Td({
  children,
  className,
  align = "left",
  hideBelow,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  hideBelow?: keyof typeof HIDE;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        "px-4 py-3.5 align-middle text-slate-600 first:pl-5 last:pr-5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        hideBelow && HIDE[hideBelow],
        className,
      )}
    >
      {children}
    </td>
  );
}

/** A right-aligned cluster of row actions. */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}
