"use client";

import { useCallback, useState } from "react";
import { BellIcon } from "@/components/admin/icons";
import { useDismiss } from "@/components/admin/ui/use-dismiss";
import { cn } from "@/lib/utils";
import { activityTone, describeActivity } from "@/components/admin/activity";

export type ActivityItem = { id: string; action: string; entity: string; createdAt: string };

export function NotificationBell({ activity }: { activity: ActivityItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(isOpen, close);
  // Lazy initializer: runs once on mount rather than on every render.
  const [dayAgo] = useState(() => Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = activity.filter((item) => new Date(item.createdAt).getTime() >= dayAgo).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-popover-trigger
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={recentCount > 0 ? `Recent activity, ${recentCount} in the last day` : "Recent activity"}
        aria-expanded={isOpen}
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <BellIcon className="size-5" />
        {recentCount > 0 && (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-navy-900">Recent activity</p>
            {recentCount > 0 && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                {recentCount} today
              </span>
            )}
          </div>
          {activity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No recent activity.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {activity.map((item) => (
                <li key={item.id} className="flex gap-3 px-4 py-2.5">
                  <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", activityTone(item.action))} />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{describeActivity(item)}</p>
                    <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
