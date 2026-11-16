import Image from "next/image";

import { Reveal } from "@/components/animations/Reveal";
import { PillButton } from "@/components/ui/PillButton";
import { HERO } from "@/lib/content";
import type { Widen } from "@/lib/cms/widen";

export function Hero({ content = HERO }: { content?: Widen<typeof HERO> }) {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1440px] px-5 pb-14 pt-[14px] sm:px-8 lg:px-[72px] lg:pb-[82px]">
        <Reveal y={12} className="flex justify-center">
          <p className="rounded-full bg-stone px-[16px] py-[8px] text-center text-[13.5px] font-bold leading-tight text-tan sm:px-[26px] sm:text-[18px]">
            {content.badge}
          </p>
        </Reveal>

        {/* The copy sits low, its button level with the illustration's foot. */}
        <div className="mt-10 grid items-end gap-10 lg:mt-[43px] lg:grid-cols-[minmax(0,659fr)_minmax(0,687fr)] lg:gap-0">
          <Reveal className="order-2 text-center lg:order-1 lg:text-left">
            <h1 className="font-display text-[32px] font-semibold leading-[1.24] text-ink sm:text-[38px] xl:text-[40px]">
              {content.heading} <em className="text-amber">{content.accent}</em>
            </h1>
            <p className="mx-auto mt-5 max-w-[590px] text-[18px] font-bold leading-[1.33] text-tan lg:mx-0 lg:mt-[22px] xl:text-[20.5px]">
              {content.body}
            </p>
            <div className="mt-10 flex justify-center lg:mt-[60px]">
              <PillButton href={content.cta.href} size="lg">
                {content.cta.label}
              </PillButton>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="order-1 lg:order-2">
            <Image
              src={content.image.src}
              alt={content.image.alt}
              width={content.image.width}
              height={content.image.height}
              priority
              sizes="(min-width: 1440px) 687px, (min-width: 1024px) 48vw, 100vw"
              className="h-auto w-full"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
