"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Position = { overflow: boolean; atStart: boolean; atEnd: boolean; thumb: number; offset: number };

/**
 * A row of slides that scrolls sideways — swiped on touch, or stepped with
 * the arrow buttons — over a bar showing how far along it is. The controls
 * hide when every slide already fits.
 */
export function Carousel({
  label,
  slideClassName,
  className,
  children,
}: {
  label: string;
  /** Sets each slide's width, which decides how many show at once. */
  slideClassName: string;
  className?: string;
  children: React.ReactNode;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState<Position>({ overflow: false, atStart: true, atEnd: true, thumb: 100, offset: 0 });
  const slides = Children.toArray(children);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const thumb = (track.clientWidth / track.scrollWidth) * 100;
    setPosition({
      overflow: max > 1,
      atStart: track.scrollLeft <= 1,
      atEnd: track.scrollLeft >= max - 1,
      thumb,
      offset: max > 0 ? (track.scrollLeft / max) * (100 - thumb) : 0,
    });
  }, []);

  // Fires once on mount and again whenever the track resizes, including
  // when a hidden gallery tab is shown.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  function step(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className={className}>
      <ul
        ref={trackRef}
        onScroll={measure}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1 [scrollbar-width:none] lg:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <li
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
            // Positioned, so absolutely placed content (screen-reader text) stays inside the scroller.
            className={cn("relative shrink-0 snap-start", slideClassName)}
          >
            {slide}
          </li>
        ))}
      </ul>

      {position.overflow && (
        <div className="mt-7 flex items-center gap-6 lg:mt-9">
          <div aria-hidden className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-ink/10">
            <div
              className="absolute inset-y-0 rounded-full bg-amber transition-[left] duration-150"
              style={{ width: `${position.thumb}%`, left: `${position.offset}%` }}
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <ArrowButton direction={-1} disabled={position.atStart} onClick={() => step(-1)} />
            <ArrowButton direction={1} disabled={position.atEnd} onClick={() => step(1)} />
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowButton({ direction, disabled, onClick }: { direction: -1 | 1; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === -1 ? "Previous slides" : "Next slides"}
      className="grid size-11 place-items-center rounded-full border border-ink/25 text-ink transition-colors hover:bg-stone disabled:pointer-events-none disabled:opacity-35"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-5", direction === -1 && "rotate-180")}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}
