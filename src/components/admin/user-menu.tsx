"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, GearIcon, GlobeIcon, LogOutIcon } from "@/components/admin/icons";
import { useDismiss } from "@/components/admin/ui/use-dismiss";
import type { SafeUser } from "@/lib/dal";

const ROLE_LABELS: Record<string, string> = { SUPER_ADMIN: "Super Admin", ADMIN: "Administrator", EDITOR: "Editor" };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function UserMenu({
  user,
  logoutAction,
  canEditSettings = false,
}: {
  user: SafeUser;
  logoutAction: () => void;
  canEditSettings?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const ref = useDismiss<HTMLDivElement>(isOpen, close);
  const role = ROLE_LABELS[user.role] ?? user.role;

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-popover-trigger
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-1.5 transition-colors hover:bg-slate-100 sm:pr-2.5"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-primary-700 text-xs font-semibold text-white ring-2 ring-white">
          {initials(user.name)}
        </span>
        <span className="hidden text-left md:block">
          <span className="block max-w-[160px] truncate text-sm font-medium leading-5 text-navy-900">{user.name}</span>
          <span className="block text-xs leading-4 text-slate-500">{role}</span>
        </span>
        <ChevronDownIcon className={`hidden size-4 text-slate-400 transition-transform sm:block ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-white p-1.5 shadow-pop"
        >
          <div className="px-2.5 pb-2.5 pt-2">
            <p className="truncate text-sm font-semibold text-navy-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
            <span className="mt-2 inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
              {role}
            </span>
          </div>
          <div className="my-1 h-px bg-line" />
          {canEditSettings && (
            <Link href="/admin/settings" role="menuitem" onClick={close} className={itemClass}>
              <GearIcon className="size-4 text-slate-400" />
              Site settings
            </Link>
          )}
          <a href="/" target="_blank" rel="noopener noreferrer" role="menuitem" onClick={close} className={itemClass}>
            <GlobeIcon className="size-4 text-slate-400" />
            View website
          </a>
          <div className="my-1 h-px bg-line" />
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className={`${itemClass} text-red-600 hover:bg-red-50`}>
              <LogOutIcon className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
