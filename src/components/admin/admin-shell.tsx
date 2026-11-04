"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_GROUPS, type AdminNavItem } from "@/config/navigation";
import type { SafeUser } from "@/lib/dal";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/admin/global-search";
import { NotificationBell, type ActivityItem } from "@/components/admin/notification-bell";
import { UserMenu } from "@/components/admin/user-menu";
import {
  HomeIcon,
  DocumentIcon,
  ChatIcon,
  PeopleIcon,
  InboxIcon,
  ImageIcon,
  GearIcon,
  GlobeIcon,
  MenuIcon,
  SidebarIcon,
  XIcon,
} from "@/components/admin/icons";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const NAV_ICONS: Record<string, IconType> = {
  ageGroups: PeopleIcon,
  subscriptions: DocumentIcon,
  blog: DocumentIcon,
  testimonials: ChatIcon,
  enquiries: InboxIcon,
  media: ImageIcon,
  settings: GearIcon,
};

const COLLAPSE_KEY = "mindvines-admin-sidebar-collapsed";

export function AdminShell({
  user,
  visibleNav,
  logoutAction,
  recentActivity,
  badges = {},
  canEditSettings = false,
  children,
}: {
  user: SafeUser;
  visibleNav: AdminNavItem[];
  logoutAction: () => void;
  recentActivity: ActivityItem[];
  /** Counts shown beside nav items, keyed by href. Zero hides the badge. */
  badges?: Record<string, number>;
  canEditSettings?: boolean;
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  // The collapsed preference is per browser; storage can be unavailable
  // (private mode, blocked site data), in which case it simply isn't kept.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a stored preference after hydration
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setIsCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      } catch {}
      return !prev;
    });
  }

  // The mobile drawer closes on Escape and locks the page behind it.
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setIsMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-surface">
      <a
        href="#admin-main"
        className="sr-only z-[60] rounded-lg bg-white px-3 py-2 text-sm font-medium text-primary-700 shadow-pop focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      {/* Mobile drawer backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobile}
        aria-hidden="true"
      />

      <aside
        aria-label="Admin navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-line bg-white transition-[transform,width] duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          isMobileOpen ? "translate-x-0 shadow-pop" : "-translate-x-full",
          isCollapsed && "lg:w-[76px]",
        )}
      >
        <div className={cn("flex h-16 shrink-0 items-center justify-between gap-2 px-5", isCollapsed && "lg:justify-center lg:px-0")}>
          <Link href="/admin/dashboard" onClick={closeMobile} aria-label="Mindvines admin — dashboard" className="block">
            {/* The full lockup, or only the leaf app icon when collapsed. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
            <img
              src="/images/logo.png"
              alt=""
              width={119}
              height={40}
              className={cn("h-10 w-[119px] max-w-none", isCollapsed && "lg:hidden")}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
            <img
              src="/icon.png"
              alt=""
              width={40}
              height={40}
              className={cn("hidden size-10 rounded-xl", isCollapsed && "lg:block")}
            />
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="inline-flex size-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 pb-4 pt-3">
          <NavSection title="Overview" collapsed={isCollapsed}>
            <NavLink
              href="/admin/dashboard"
              icon={HomeIcon}
              label="Dashboard"
              collapsed={isCollapsed}
              active={isActive("/admin/dashboard")}
              onNavigate={closeMobile}
            />
          </NavSection>

          {ADMIN_NAV_GROUPS.map((group) => {
            const items = visibleNav.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <NavSection key={group} title={group} collapsed={isCollapsed}>
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={NAV_ICONS[item.resource] ?? DocumentIcon}
                    label={item.label}
                    badge={badges[item.href]}
                    collapsed={isCollapsed}
                    active={isActive(item.href)}
                    onNavigate={closeMobile}
                  />
                ))}
              </NavSection>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-line p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title={isCollapsed ? "View website" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
              isCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <GlobeIcon className="size-5 shrink-0" />
            <span className={cn(isCollapsed && "lg:sr-only")}>View website</span>
          </a>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-pressed={isCollapsed}
            title={isCollapsed ? "Expand sidebar" : undefined}
            className={cn(
              "hidden h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:flex",
              isCollapsed && "lg:justify-center lg:px-0",
            )}
          >
            <SidebarIcon className="size-5 shrink-0" />
            <span className={cn(isCollapsed && "sr-only")}>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={isMobileOpen}
            className="-ml-1 inline-flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <MenuIcon className="size-5" />
          </button>
          <Link href="/admin/dashboard" className="shrink-0 sm:hidden" aria-label="Dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand image */}
            <img src="/images/logo.png" alt="" width={95} height={32} className="h-8 w-[95px]" />
          </Link>

          <div className="hidden min-w-0 flex-1 sm:block">
            <GlobalSearch />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell activity={recentActivity} />
            <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />
            <UserMenu user={user} logoutAction={logoutAction} canEditSettings={canEditSettings} />
          </div>
        </header>

        <main id="admin-main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavSection({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400",
          collapsed && "lg:sr-only",
        )}
      >
        {title}
      </p>
      {collapsed && <span aria-hidden className="mx-auto mb-2 hidden h-px w-6 bg-line lg:block" />}
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  badge,
  collapsed,
  active,
  onNavigate,
}: {
  href: string;
  icon: IconType;
  label: string;
  badge?: number;
  collapsed: boolean;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={cn(
          "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
          active ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        {active && <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-primary-500" />}
        <Icon className={cn("size-5 shrink-0", active ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600")} />
        <span className={cn("truncate", collapsed && "lg:sr-only")}>{label}</span>
        {badge ? (
          <span
            className={cn(
              "ml-auto rounded-full bg-primary-600 px-1.5 py-px text-[11px] font-semibold tabular-nums text-white",
              collapsed && "lg:absolute lg:right-2 lg:top-1 lg:ml-0 lg:min-w-4 lg:px-1 lg:text-[10px]",
            )}
          >
            {badge > 99 ? "99+" : badge}
            <span className="sr-only"> new</span>
          </span>
        ) : null}
      </Link>
    </li>
  );
}
