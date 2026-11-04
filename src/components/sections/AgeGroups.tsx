import Image from "next/image";

import { Reveal } from "@/components/animations/Reveal";
import { AGE_GROUPS, SECTION_IDS } from "@/lib/content";

/** Two stone cards, each one link through to that age group's plans. */
export function AgeGroups() {
  return (
    <section id={SECTION_IDS.ageGroups} className="bg-paper">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-[51px] sm:px-8 lg:pb-[160px]">
        <Reveal>
          <h2 className="fluid-heading text-center font-display font-bold text-ink">{AGE_GROUPS.heading}</h2>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-[1148px] gap-8 md:grid-cols-2 lg:mt-[72px] lg:gap-[116px]">
          {AGE_GROUPS.groups.map((group, index) => (
            <Reveal key={group.title} delay={index * 0.1} className="h-full">
              <a
                href={group.href}
                className="group flex h-full flex-col items-center rounded-[40px] bg-stone px-6 pb-[60px] pt-[67px] text-center text-ink underline underline-offset-[4px] shadow-card transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="w-full max-w-[368px] overflow-hidden rounded-[24px]">
                  <Image
                    src={group.image.src}
                    alt={group.image.alt}
                    width={group.image.width}
                    height={group.image.height}
                    sizes="(min-width: 768px) 368px, 90vw"
                    className="aspect-[368/362] h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <h3 className="mt-[36px] font-display text-[34px] font-semibold leading-tight lg:text-[40px]">{group.title}</h3>
                <p className="mt-[18px] font-display text-[20px] font-semibold leading-tight lg:text-[22.77px]">{group.subtitle}</p>
                <p className="mt-[24px] max-w-[390px] text-[18px] font-bold leading-[1.33] text-tan xl:text-[20.5px]">{group.body}</p>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
