"use client";

import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Underlined tabs over one panel each. Only the active panel renders its
 * slides, since images in a hidden panel have no size to load at. A single
 * tab shows its panel alone.
 */
export function GalleryTabs({ label, tabs }: { label: string; tabs: { label: string; content: React.ReactNode }[] }) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 1) return <>{tabs[0].content}</>;

  function select(index: number) {
    const next = (index + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const targets: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    select(targets[event.key]);
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-x-8 overflow-x-auto border-b border-ink/15 [scrollbar-width:none] lg:gap-x-12 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, index) => (
          <button
            key={index}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`${baseId}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 font-display text-[20px] font-semibold transition-colors lg:text-[24px]",
              index === active ? "border-amber text-ink" : "border-transparent text-tan hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, index) => (
        <div
          key={index}
          role="tabpanel"
          id={`${baseId}-panel-${index}`}
          aria-labelledby={`${baseId}-tab-${index}`}
          hidden={index !== active}
          className="mt-8 lg:mt-10"
        >
          {index === active && tab.content}
        </div>
      ))}
    </div>
  );
}
