"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PROMO_EXCLUDED_PATHS, markPromoSeen, promoAlreadySeen, type PromoPopupConfig } from "@/lib/promo-popup";
import { PromoPopupCard } from "@/components/promo/PromoPopupCard";

const EXIT_MS = 200;
/** If the banner image is slow, show the popup anyway after this long. */
const IMAGE_WAIT_MS = 2500;

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The promotional popup. It waits for the page to finish loading and then the
 * configured delay, mounts only then (so it adds nothing to the initial
 * render), fades in once its image is ready (so nothing jumps), and is shown
 * at most once per page visit however many pages the visitor opens: this
 * component lives in the shared layout, so client-side navigation keeps it.
 */
export function PromoPopup({ config }: { config: PromoPopupConfig }) {
  const pathname = usePathname();
  const titleId = useId();
  const descriptionId = useId();
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [ready, setReady] = useState(false);
  const shown = useRef(false);
  const container = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const exitTimer = useRef<number | undefined>(undefined);

  const excluded = PROMO_EXCLUDED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // Schedule: after the page has loaded, then the delay.
  useEffect(() => {
    if (shown.current || excluded) return;
    if (promoAlreadySeen(config.frequency, config.version)) {
      shown.current = true;
      return;
    }
    let timer: number | undefined;
    const start = () => {
      timer = window.setTimeout(() => {
        if (shown.current) return;
        shown.current = true;
        markPromoSeen(config.frequency, config.version);
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setMounted(true);
      }, Math.max(0, config.delaySeconds) * 1000);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("load", start);
    };
  }, [excluded, config.frequency, config.version, config.delaySeconds]);

  const close = useCallback(() => {
    setEntered(false);
    window.clearTimeout(exitTimer.current);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    exitTimer.current = window.setTimeout(() => {
      setMounted(false);
      setReady(false);
      returnFocus.current?.focus?.();
    }, reduce ? 0 : EXIT_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(exitTimer.current), []);

  // Fade in once the image has loaded, or after a short wait.
  const settle = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (!mounted) return;
    const timer = window.setTimeout(settle, IMAGE_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, settle]);
  useEffect(() => {
    if (!ready) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [ready]);

  // While open: no background scroll, Escape closes, focus stays inside.
  useEffect(() => {
    if (!entered || excluded) return;
    const body = document.body;
    const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { close(); return; }
      if (event.key !== "Tab") return;
      const nodes = container.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      else if (!container.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
    };
  }, [entered, excluded, close]);

  useEffect(() => {
    if (entered) container.current?.querySelector<HTMLElement>("[data-promo-close]")?.focus({ preventScroll: true });
  }, [entered]);

  // Never leave a popup over the checkout or renewal pages.
  if (!mounted || excluded) return null;
  const labelled = config.title ? { "aria-labelledby": titleId } : { "aria-label": "Promotion" };

  return (
    <div
      ref={container}
      role="dialog"
      aria-modal="true"
      {...labelled}
      aria-describedby={config.description ? descriptionId : undefined}
      onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overscroll-contain transition-opacity duration-300 motion-reduce:transition-none ${entered ? "opacity-100" : "pointer-events-none opacity-0"}`}
      style={{
        backgroundColor: `rgba(0,0,0,${Math.min(90, Math.max(0, config.overlayOpacity)) / 100})`,
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        paddingLeft: "max(4vw, env(safe-area-inset-left))",
        paddingRight: "max(4vw, env(safe-area-inset-right))",
      }}
    >
      {/* min-h/my-auto: a card taller than the screen scrolls inside the overlay instead of being cut off. */}
      <div className={`my-auto w-full max-w-[880px] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${entered ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"}`}>
        <PromoPopupCard config={config} titleId={titleId} descriptionId={descriptionId} onClose={close} onNavigate={close} onImageSettled={settle} />
      </div>
    </div>
  );
}
