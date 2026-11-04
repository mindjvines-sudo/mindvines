"use client";

import { useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type PlanCard = {
  title: string;
  price: string;
  period: string;
  badge: string;
  highlight: boolean;
  buttonLabel: string;
  buttonHref: string;
};

/** One duration tab and the plans offered for it. */
export type PlanOption = {
  tab: string;
  cards: PlanCard[];
};

/**
 * The live site's plan switcher: a grey bar of durations over that duration's
 * plan cards (one, or several side by side), the active duration underlined.
 */
export function PlanTabs({
  label,
  plans,
  priceNote,
  footnote,
}: {
  label: string;
  plans: PlanOption[];
  priceNote: string;
  footnote: string;
}) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(index: number) {
    const next = (index + plans.length) % plans.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const targets: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: plans.length - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    select(targets[event.key]);
  }

  const cards = plans[active].cards;
  const multiple = plans.some((option) => option.cards.length > 1);

  return (
    <div className={cn("mx-auto w-full", multiple ? "max-w-[1152px]" : "max-w-[448px]")}>
      {plans.length > 1 && (
        <div
          role="tablist"
          aria-label={label}
          className={cn(
            "flex h-[58px] items-center justify-around rounded-[27px] border-2 border-paper bg-[#d9d9d9] px-[9px] lg:h-[70px]",
            multiple && "shadow-[0_0_44px_0_rgb(0_0_0/0.25)]",
          )}
        >
          {plans.map((option, index) => (
            <button
              key={index}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={index === active}
              aria-controls={`${baseId}-panel`}
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "h-[46px] whitespace-nowrap rounded-[8px] px-2 text-[18px] font-bold text-[#0a0b08] underline-offset-[5px] lg:text-[22.77px]",
                index === active ? "underline" : "hover:underline",
              )}
            >
              {option.tab}
            </button>
          ))}
        </div>
      )}

      <div
        role={plans.length > 1 ? "tabpanel" : undefined}
        id={`${baseId}-panel`}
        aria-labelledby={plans.length > 1 ? `${baseId}-tab-${active}` : undefined}
        className={cn("grid gap-6", multiple ? "mt-[37px]" : "mt-[11px]", gridClasses(cards.length))}
      >
        {cards.map((card, index) => (
          <PlanCardView key={index} card={card} tab={plans[active].tab} titled={cards.length > 1} footnote={footnote} priceNote={priceNote} />
        ))}
      </div>
    </div>
  );
}

/** One card stays a plain centred card; more share the row, wrapping on narrower screens. */
function gridClasses(count: number) {
  if (count <= 1) return "";
  if (count === 2) return "mx-auto max-w-[448px] md:max-w-none md:grid-cols-[repeat(2,minmax(0,332px))] md:justify-center lg:gap-x-[65px]";
  if (count === 3) return "mx-auto max-w-[448px] md:max-w-none md:grid-cols-2 lg:grid-cols-3 lg:gap-x-[65px] lg:px-[13px]";
  return "mx-auto max-w-[448px] md:max-w-none md:grid-cols-2 xl:grid-cols-4";
}

function PlanCardView({
  card,
  tab,
  titled,
  priceNote,
  footnote,
}: {
  card: PlanCard;
  tab: string;
  titled: boolean;
  priceNote: string;
  footnote: string;
}) {
  const badge = card.badge && (
    <p className="absolute right-[12px] top-[17px] grid h-[36px] min-w-[120px] place-items-center rounded-full bg-[#c8c1b8] px-6 font-label text-[17px] font-bold text-ink lg:h-[41px] lg:min-w-[162px] lg:text-[20.25px]">
      {card.badge}
    </p>
  );
  const button = (className: string) => (
    <a
      href={card.buttonHref}
      className={cn(
        "inline-flex h-[47px] items-center justify-center rounded-full border border-r-[3px] border-b-[3px] border-cocoa bg-amber px-6 font-ui text-[18px] text-paper transition-colors hover:bg-[#f5b21c]",
        className,
      )}
    >
      {card.buttonLabel}
      <span className="sr-only">: {titled ? `${card.title}, ${tab}` : tab}</span>
    </a>
  );

  // A duration's only plan: the plain card, priced and nothing more.
  if (!titled) {
    return (
      <div className="relative flex min-h-[346px] flex-col items-center rounded-[28.5px] border border-amber bg-paper px-6 pb-[24px] pt-[91px] shadow-[0_2px_2px_0_rgb(240_165_0/0.25)]">
        {badge}
        <div className="w-[200px] max-w-full">
          <p className="whitespace-nowrap font-bold text-black">
            <span className="text-[38px] leading-none tabular-nums">{card.price}</span>
            {card.period && <span className="ml-[7px] text-[16px] text-[#717171]">/ {card.period}</span>}
          </p>
          {priceNote && <p className="mt-[18px] text-[16px] font-bold leading-none text-[#717171]">{priceNote}</p>}
        </div>
        {button("mt-[80px] min-w-[207px]")}
        {footnote && <p className="mt-[15px] text-center text-[18.2px] font-bold text-[#717171]">{footnote}</p>}
      </div>
    );
  }

  // One of several: titled, sharing four rows with its neighbours so the
  // titles, dividers, prices and buttons line up across the row.
  return (
    <div
      className={cn(
        "relative row-span-4 grid grid-rows-subgrid justify-items-center gap-y-0 rounded-[20.5px] border border-[#c8c1b8] px-6 pb-[38px] pt-[40px]",
        card.highlight ? "bg-white shadow-[0_0_12px_0_rgb(0_0_0/0.25)]" : "bg-[#f1e9d8] shadow-[0_2px_8px_0_rgb(200_193_184/0.25)]",
      )}
    >
      {badge}
      <div className="flex w-full flex-col lg:min-h-[101px]">
        <h3 className="break-words pb-[19px] text-[24px] font-bold leading-[1.5] text-[#4d3f32] lg:text-[27.32px]">{card.title}</h3>
        <div className="mx-[3px] mt-auto border-t border-dashed border-amber" aria-hidden />
      </div>
      <div className="w-[200px] max-w-full pt-[43px]">
        <p className="whitespace-nowrap font-bold text-black">
          <span className="text-[38px] leading-[1.36] tabular-nums lg:text-[42px]">{card.price}</span>
          {card.period && <span className="ml-[7px] text-[16px] text-[#717171]">/ {card.period}</span>}
        </p>
        {priceNote && <p className="mt-[2px] text-[16px] font-bold text-[#717171]">{priceNote}</p>}
      </div>
      {button("mt-[70px] min-w-[227px] self-start")}
      <p className={cn("mt-[20px] text-center text-[16px] font-bold text-[#717171]", !footnote && "invisible")}>{footnote}</p>
    </div>
  );
}
