import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "@/components/admin/icons";
import { cn } from "@/lib/utils";
import { buttonClasses } from "./button";
import { inputClasses } from "./form";

type Params = Record<string, string | undefined>;

/** Builds `path?…` from params, dropping empty values. */
export function hrefWith(path: string, params: Params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * GET search form for server-rendered lists. Other active filters ride
 * along as hidden fields so searching never drops them.
 */
export function SearchForm({
  placeholder,
  defaultValue,
  keep = {},
  children,
}: {
  placeholder: string;
  defaultValue?: string;
  keep?: Params;
  /** Extra controls, such as a status select, placed before the button. */
  children?: React.ReactNode;
}) {
  return (
    <form method="get" role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {Object.entries(keep).map(([key, value]) =>
        value ? <input key={key} type="hidden" name={key} value={value} /> : null,
      )}
      <div className="relative min-w-0 sm:w-72">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          name="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label={placeholder}
          className={inputClasses(false, "h-10 pl-9")}
        />
      </div>
      {children}
      <button type="submit" className={buttonClasses({ variant: "secondary" })}>
        Search
      </button>
    </form>
  );
}

/** Segmented status filter rendered as links, so it works without JavaScript. */
export function FilterTabs({
  tabs,
  label,
}: {
  tabs: { label: string; href: string; active: boolean; count?: number }[];
  label: string;
}) {
  return (
    <nav aria-label={label} className="relative -mx-1 overflow-x-auto px-1">
      <ul className="inline-flex min-w-max gap-1 rounded-xl bg-slate-100/80 p-1">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors",
                tab.active ? "bg-white text-navy-900 shadow-card" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px] tabular-nums",
                    tab.active ? "bg-primary-50 text-primary-700" : "bg-slate-200/80 text-slate-500",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** "Showing 1–20 of 54" with previous/next links that keep every filter. */
export function Pagination({
  path,
  page,
  pages,
  total,
  limit,
  params = {},
  noun = "results",
}: {
  path: string;
  page: number;
  pages: number;
  total: number;
  limit: number;
  params?: Params;
  noun?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const link = (target: number) => hrefWith(path, { ...params, page: target > 1 ? String(target) : undefined });

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 text-[13px] text-slate-500 sm:flex-row">
      <p>
        {total === 0 ? (
          `No ${noun}`
        ) : (
          <>
            Showing <span className="font-medium tabular-nums text-slate-700">{from}–{to}</span> of{" "}
            <span className="font-medium tabular-nums text-slate-700">{total}</span> {noun}
          </>
        )}
      </p>
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <PageLink href={page > 1 ? link(page - 1) : undefined} label="Previous page">
            <ChevronLeftIcon />
            Previous
          </PageLink>
          <span className="tabular-nums">
            {page} / {pages}
          </span>
          <PageLink href={page < pages ? link(page + 1) : undefined} label="Next page">
            Next
            <ChevronRightIcon />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({ href, label, children }: { href?: string; label: string; children: React.ReactNode }) {
  const className = buttonClasses({ variant: "secondary", size: "sm" });
  if (!href) {
    return (
      <span aria-disabled className={cn(className, "pointer-events-none opacity-45")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
