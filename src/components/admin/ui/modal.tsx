"use client";

import { useEffect, useId, useRef } from "react";
import { XIcon } from "@/components/admin/icons";
import { cn } from "@/lib/utils";

/**
 * Shared modal shell built on <dialog>, so focus is trapped and returned
 * and Escape closes it natively. Clicking the backdrop closes it too.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto max-h-[min(88vh,900px)] w-[calc(100%-2rem)] overflow-hidden rounded-2xl bg-white p-0 text-slate-900 shadow-pop",
        { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-5xl" }[size],
      )}
    >
      {open && (
        <div className="flex max-h-[min(88vh,900px)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-navy-900">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <XIcon className="size-[18px]" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line bg-slate-50/80 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
