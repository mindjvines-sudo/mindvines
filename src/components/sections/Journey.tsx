import Image from "next/image";

import { Reveal } from "@/components/animations/Reveal";
import { JOURNEY, SECTION_IDS, type JourneyStep } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Desktop: the live site's zig-zag board — steps 1, 3, 5 on the top row,
 * 2 and 4 below, joined by hand-drawn dotted arrows. Everything is placed in
 * design pixels on a 1300px-wide canvas and converted to container-query
 * units, so the whole board (type included) scales as one piece.
 */
const CANVAS_WIDTH = 1300;
const cq = (px: number) => `${((px / CANVAS_WIDTH) * 100).toFixed(3)}cqw`;

/** Horizontal centre and top of each step, and how wide its caption runs. */
const STEP_LAYOUT: Record<number, { cx: number; top: number; width: number }> = {
  1: { cx: 156, top: 0, width: 230 },
  2: { cx: 350, top: 372, width: 270 },
  3: { cx: 608, top: 0, width: 360 },
  4: { cx: 848, top: 372, width: 290 },
  5: { cx: 1107, top: 0, width: 370 },
};

const ARROWS = [
  { src: "/images/arrow-down-red.png", left: 87, top: 324, width: 154, height: 218 },
  { src: "/images/arrow-up.webp", left: 303, top: 118, width: 183, height: 263 },
  { src: "/images/arrow-down.webp", left: 561, top: 340, width: 192, height: 219 },
  { src: "/images/arrow-up.webp", left: 818, top: 122, width: 169, height: 252 },
  // A straight arrow drawn left-to-right, turned to point down at the finale.
  { src: "/images/arrow-straight.png", left: 1030, top: 375, width: 173, height: 23, rotate: true },
];

export function Journey() {
  const { steps, finale } = JOURNEY;

  return (
    <section id={SECTION_IDS.howItWorks} className="bg-cream">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-[34px] sm:px-8 lg:px-[70px] lg:pb-[110px]">
        <Reveal>
          <h2 className="fluid-heading text-center font-display font-bold text-ink">{JOURNEY.heading}</h2>
        </Reveal>

        {/* Desktop board */}
        <div className="@container mx-auto mt-[48px] hidden max-w-[1300px] lg:block">
          <div className="relative aspect-[1300/730]">
            {ARROWS.map((arrow, index) => (
              <Image
                key={index}
                src={arrow.src}
                alt=""
                width={arrow.width * 2}
                height={arrow.height * 2}
                className={cn("absolute max-w-none", arrow.rotate && "rotate-90")}
                style={{ left: cq(arrow.left), top: cq(arrow.top), width: cq(arrow.width), height: cq(arrow.height) }}
              />
            ))}

            <ol className="absolute inset-0">
              {steps.map((step) => {
                const layout = STEP_LAYOUT[step.number];
                return (
                  <li
                    key={step.number}
                    className="absolute"
                    style={{ left: cq(layout.cx - layout.width / 2), top: cq(layout.top), width: cq(layout.width) }}
                  >
                    <Reveal delay={step.number * 0.08}>
                      <StepCard step={step} scale={cq} />
                    </Reveal>
                  </li>
                );
              })}

              <li className="absolute" style={{ left: cq(1019), top: cq(488), width: cq(220) }}>
                <Reveal delay={0.5} className="flex flex-col items-center">
                  <p className="text-center font-display font-semibold text-ink" style={{ fontSize: cq(22.77), lineHeight: 1.22 }}>
                    {finale.text}
                  </p>
                  <Image
                    src={finale.image.src}
                    alt=""
                    width={finale.image.width}
                    height={finale.image.height}
                    className="max-w-none"
                    style={{ marginTop: cq(29), width: cq(122), height: cq(144) }}
                  />
                </Reveal>
              </li>
            </ol>
          </div>
        </div>

        {/* Mobile and tablet: one column, a dotted line between each step */}
        <ol className="mx-auto mt-10 flex max-w-[420px] flex-col items-center lg:hidden">
          {steps.map((step) => (
            <li key={step.number} className="flex flex-col items-center">
              <Reveal>
                <StepCard step={step} />
              </Reveal>
              <span aria-hidden className="my-4 h-12 border-l-2 border-dotted border-amber" />
            </li>
          ))}
          <li className="flex flex-col items-center gap-4">
            <p className="max-w-[220px] text-center font-display text-[20px] font-semibold leading-[1.22] text-ink">
              {finale.text}
            </p>
            <Image src={finale.image.src} alt="" width={finale.image.width} height={finale.image.height} className="h-[144px] w-auto" />
          </li>
        </ol>
      </div>
    </section>
  );
}

/**
 * A butter-yellow disc holding the step's sketch, then its title and line.
 * On the desktop board every size goes through `scale` so it tracks the
 * canvas; on mobile it renders at fixed sizes.
 */
function StepCard({ step, scale }: { step: JourneyStep; scale?: (px: number) => string }) {
  const sized = (px: number) => (scale ? scale(px) : `${px}px`);
  // Each sketch keeps the size it has on the live board, inside a 190 × 180 disc.
  const iconWidth = step.icon.width / 2;
  const iconHeight = step.icon.height / 2;

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="grid shrink-0 place-items-center rounded-[50%] bg-butter"
        style={{ width: sized(190), height: sized(180) }}
      >
        <Image
          src={step.icon.src}
          alt=""
          width={step.icon.width}
          height={step.icon.height}
          className="max-w-none"
          style={{ width: sized(iconWidth), height: sized(iconHeight) }}
        />
      </div>
      <h3
        className="font-display font-semibold text-ink"
        style={{ marginTop: sized(28), fontSize: scale ? scale(22.77) : "20px", lineHeight: 1.25 }}
      >
        {step.number}. {step.title}
      </h3>
      <p
        className="font-semibold text-tan"
        style={{ fontSize: scale ? scale(22.77) : "19px", lineHeight: 1.25, marginTop: sized(2) }}
      >
        {step.body}
      </p>
    </div>
  );
}
