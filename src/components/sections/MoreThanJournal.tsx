import Image from "next/image";

import { Reveal } from "@/components/animations/Reveal";
import { PillButton } from "@/components/ui/PillButton";
import { MORE_THAN_JOURNAL } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Three columns: a tall card either side and two short cards stacked in the
 * middle. Every card carries a thicker coloured rule along its rounded top —
 * amber on the light cards, tan on the stone ones.
 */
export function MoreThanJournal() {
  const { cohort, perspectives, reviewed, physical } = MORE_THAN_JOURNAL;

  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-[34px] sm:px-8 lg:pb-[150px]">
        <Reveal>
          <h2 className="fluid-heading text-center font-display font-bold text-ink">{MORE_THAN_JOURNAL.heading}</h2>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-[1181px] gap-8 md:grid-cols-2 lg:mt-[40px] lg:grid-cols-[331fr_413fr_332fr] lg:gap-[50px]">
          <Reveal className="h-full">
            <Card tone="light" className="h-full px-[12px] pb-[28px] pt-[20px]">
              <Image
                src={cohort.image.src}
                alt={cohort.image.alt}
                width={cohort.image.width}
                height={cohort.image.height}
                sizes="317px"
                className="h-auto w-full"
              />
              <h3 className="mt-[30px] text-center font-display text-[22px] font-semibold text-ink">{cohort.title}</h3>
              <div className="mt-[18px] px-[12px] text-[19px] font-bold leading-[1.42] text-tan xl:text-[20.5px]">
                <p>{cohort.body}</p>
                <p className="mt-[27px] italic">{cohort.note}</p>
              </div>
            </Card>
          </Reveal>

          <div className="flex flex-col gap-8 lg:justify-between lg:gap-[40px]">
            <Reveal>
              <Card tone="stone" className="px-[14px] pb-[48px] pt-[42px] text-center lg:min-h-[233px]">
                <h3 className="font-display text-[22px] font-semibold text-ink">{perspectives.title}</h3>
                <p className="mx-auto mt-[22px] max-w-[372px] text-[19px] font-bold leading-[1.33] text-tan xl:text-[20.5px]">
                  {perspectives.body} <em>{perspectives.accent}</em>
                </p>
              </Card>
            </Reveal>
            <Reveal delay={0.08}>
              <Card tone="stone" className="relative px-[32px] pb-[90px] pt-[40px] lg:min-h-[237px]">
                <h3 className="text-center font-display text-[22px] font-semibold text-ink">{reviewed.title}</h3>
                <p className="mt-[22px] text-[19px] font-bold leading-[1.33] text-tan xl:text-[20.5px]">{reviewed.body}</p>
                <Image
                  src={reviewed.image.src}
                  alt=""
                  width={reviewed.image.width}
                  height={reviewed.image.height}
                  className="absolute bottom-[20px] right-[30px] h-[52px] w-auto"
                />
              </Card>
            </Reveal>
          </div>

          <Reveal delay={0.16} className="h-full md:col-span-2 lg:col-span-1">
            <Card tone="light" className="flex h-full flex-col items-center px-[20px] pb-[40px] pt-[44px] text-center">
              <h3 className="font-display text-[22px] font-semibold text-ink">{physical.title}</h3>
              <p className="mt-[22px] max-w-[300px] text-[19px] font-bold leading-[1.3] text-tan xl:text-[20.5px]">{physical.body}</p>
              <Image
                src={physical.image.src}
                alt={physical.image.alt}
                width={physical.image.width}
                height={physical.image.height}
                sizes="232px"
                className="mt-[28px] h-auto w-[232px]"
              />
              <div className="mt-[52px]">
                <PillButton href={physical.cta.href}>{physical.cta.label}</PillButton>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Card({
  tone,
  className,
  children,
}: {
  tone: "light" | "stone";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[32px] border border-t-[3px] border-ink/45 shadow-card",
        tone === "light" ? "border-t-amber bg-paper" : "border-t-tan bg-stone",
        className,
      )}
    >
      {children}
    </div>
  );
}
