import { Reveal, StaggerGroup, StaggerItem } from "@/components/animations/Reveal";
import { WHAT_GROWS } from "@/lib/content";
import type { Widen } from "@/lib/cms/widen";

export function WhatGrows({ content = WHAT_GROWS }: { content?: Widen<typeof WHAT_GROWS> }) {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-[34px] sm:px-8 lg:pb-[117px]">
        <Reveal className="text-center">
          <h2 className="fluid-heading font-display font-bold text-ink">{content.heading}</h2>
          <p className="mt-[28px] text-[22px] font-bold leading-tight text-amber lg:text-[27.3px]">{content.subheading}</p>
        </Reveal>

        <StaggerGroup className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-auto md:grid md:max-w-[1251px] md:snap-none md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:mt-[82px] lg:gap-[60px]">
          {content.items.map((item) => (
            <StaggerItem
              key={item.title}
              as="article"
              className="w-[82%] max-w-[340px] shrink-0 snap-center rounded-[8px] border border-amber bg-paper px-[10px] pb-[36px] pt-[34px] text-center md:w-auto md:max-w-none md:shrink md:snap-align-none lg:min-h-[282px]"
            >
              <h3 className="text-[23px] font-extrabold leading-tight text-blue xl:text-[27px]">{item.title}</h3>
              <p className="mt-[28px] px-[14px] text-[19px] font-semibold leading-[1.31] text-tan xl:text-[22.77px]">{item.body}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
