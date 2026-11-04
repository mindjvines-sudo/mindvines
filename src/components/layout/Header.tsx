"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { MENU, SITE, type MenuItem } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * The live site's header: a cream bar pinned to the top, the logo centred
 * and a hamburger on the left that slides the menu in from the left edge.
 */
export function Header() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Stable, so the drawer's open-state effect doesn't re-run on every render.
  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-cream">
        <div className="relative mx-auto flex h-[80px] max-w-[1440px] items-center justify-center px-5 lg:h-[126px]">
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="site-menu"
            className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-md transition-colors hover:bg-ink/5 lg:left-[135px]"
          >
            <span aria-hidden className="flex w-[32px] flex-col gap-[9px]">
              <span className="h-[1.5px] w-full bg-ink" />
              <span className="h-[1.5px] w-full bg-ink" />
              <span className="h-[1.5px] w-full bg-ink" />
            </span>
          </button>

          <Link href="/" aria-label={`${SITE.name} — home`} className="shrink-0">
            <Image
              src={SITE.logo.src}
              alt={SITE.name}
              width={SITE.logo.width}
              height={SITE.logo.height}
              priority
              className="h-[54px] w-auto lg:h-[87px]"
            />
          </Link>
        </div>
      </header>

      <MenuDrawer open={open} onClose={close} />
    </>
  );
}

function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // While open: Escape closes, the page behind stops scrolling, and focus
  // moves into the panel.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div id="site-menu" className={cn("fixed inset-0 z-50", !open && "pointer-events-none")} inert={!open}>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-[#e1e1e1]/90 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <nav
        aria-label="Main menu"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[min(475px,88vw)] flex-col overflow-y-auto bg-paper font-ui text-ink transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="ml-auto mr-[14px] mt-[14px] grid size-12 shrink-0 place-items-center rounded-md transition-colors hover:bg-ink/5"
        >
          <svg viewBox="0 0 24 24" className="size-[30px]" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
            <path d="M4 4l16 16M20 4 4 20" strokeLinecap="round" />
          </svg>
        </button>

        <ul className="mt-[22px] pb-10">
          {MENU.map((item) => (
            <MenuEntry key={item.label} item={item} onNavigate={onClose} />
          ))}
        </ul>
      </nav>
    </div>
  );
}

function MenuEntry({ item, onNavigate }: { item: MenuItem; onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const rowClass =
    "flex min-h-[97px] w-full items-center gap-1.5 px-[31px] text-left text-[20px] leading-[1.3] transition-colors hover:text-tan";

  if (!item.children) {
    return (
      <li>
        <a href={item.href} onClick={onNavigate} className={rowClass}>
          {item.label}
        </a>
      </li>
    );
  }

  return (
    <li>
      <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className={rowClass}>
        {item.label}
        <svg
          viewBox="0 0 10 6"
          className={cn("mt-0.5 h-[6px] w-[10px] transition-transform duration-200", expanded && "rotate-180")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden
        >
          <path d="m1 1 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {expanded && (
        <ul className="-mt-[22px] pb-[18px]">
          {item.children.map((child) => (
            <li key={child.href}>
              <a
                href={child.href}
                onClick={onNavigate}
                className="block px-[47px] py-[10px] text-[17px] font-medium text-[#43311f] transition-colors hover:text-tan"
              >
                {child.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
