import Link from "next/link";
import { ArrowLeftIcon } from "@/components/admin/icons";

/**
 * Every admin page opens with this: an optional back link, the page title,
 * a one-line description, and the page's primary actions on the right.
 */
export function PageHeader({
  title,
  description,
  back,
  actions,
  meta,
}: {
  title: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  /** Small inline content after the title, such as a status badge. */
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-primary-700"
          >
            <ArrowLeftIcon className="size-4" />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-[22px] font-semibold leading-8 tracking-[-0.01em] text-navy-900 sm:text-2xl">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
