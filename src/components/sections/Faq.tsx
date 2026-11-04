import { Reveal } from "@/components/animations/Reveal";
import { FAQ, SECTION_IDS } from "@/lib/content";

/**
 * Square-cornered ink-outlined rows. Native <details> keeps each answer
 * reachable without JavaScript and gives keyboard and screen-reader support.
 */
export function Faq() {
  return (
    <section id={SECTION_IDS.faq} className="bg-cream">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-[89px] sm:px-8 lg:pb-[102px]">
        <Reveal>
          <h2 className="fluid-heading text-center font-display font-bold text-ink">{FAQ.heading}</h2>
        </Reveal>

        <div className="mx-auto mt-10 flex max-w-[1214px] flex-col gap-[20px] lg:mt-[62px] lg:gap-[31px]">
          {FAQ.items.map((item) => (
            <details key={item.question} className="group border border-ink bg-paper">
              <summary className="flex min-h-[80px] cursor-pointer list-none items-center justify-between gap-6 px-[24px] py-[22px] text-[18px] font-bold leading-[1.35] text-tan lg:text-[20px] [&::-webkit-details-marker]:hidden">
                {item.question}
                <svg
                  viewBox="0 0 20 11"
                  className="h-[11px] w-[20px] shrink-0 transition-transform duration-200 group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  aria-hidden
                >
                  <path d="m1 1 9 9 9-9" strokeLinejoin="round" />
                </svg>
              </summary>
              <p className="-mt-[4px] px-[24px] pb-[40px] text-[17px] font-bold leading-[1.5] text-ink lg:text-[20px]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
