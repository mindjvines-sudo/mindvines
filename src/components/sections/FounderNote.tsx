import { Reveal } from "@/components/animations/Reveal";
import { FOUNDER_NOTE } from "@/lib/content";
import { cn } from "@/lib/utils";

type Run = (typeof FOUNDER_NOTE.paragraphs)[number][number];

/** The founder's letter, set on a page torn out of a spiral notebook. */
export function FounderNote() {
  const { heading, paragraphs, signOff, author } = FOUNDER_NOTE;

  return (
    <section className="bg-butter">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-[60px] sm:px-8 lg:pb-[133px] lg:pl-[113px] lg:pr-[94px]">
        <Reveal>
          <h2 className="fluid-heading text-center font-display font-bold text-ink">{heading}</h2>
        </Reveal>

        <Reveal className="mt-10 lg:mt-[62px]">
          <article className="notebook-holes relative bg-sheet py-[52px] pl-[84px] pr-6 text-[17px] font-bold leading-[1.3] text-ink shadow-[6px_0_0_0_#96917c] sm:pr-10 lg:pb-[85px] lg:pl-[100px] lg:pr-[66px] lg:pt-[70px] lg:text-[22.77px]">
            <div className="flex flex-col gap-[1.3em]">
              {paragraphs.map((runs, index) => (
                <p key={index}>{renderRuns(runs)}</p>
              ))}
              <div>
                {signOff.map((runs, index) => (
                  <p key={index}>{renderRuns(runs)}</p>
                ))}
              </div>
              <p className="text-blue">
                {author.name}
                <br />
                {author.role}
              </p>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

function renderRuns(runs: Run[]) {
  return runs.map((run, index) =>
    run.accent || run.italic ? (
      <span key={index} className={cn(run.accent && "font-black text-tan", run.italic && "italic")}>
        {run.text}
      </span>
    ) : (
      <span key={index}>{run.text}</span>
    ),
  );
}
