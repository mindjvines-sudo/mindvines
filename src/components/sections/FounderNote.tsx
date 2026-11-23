import { Reveal } from "@/components/animations/Reveal";
import { FOUNDER_NOTE } from "@/lib/content";
import type { Widen } from "@/lib/cms/widen";
import { cn } from "@/lib/utils";

export type FounderNoteContent = Widen<typeof FOUNDER_NOTE>;
type Run = FounderNoteContent["paragraphs"][number][number];

/** The founder's letter, set on a page torn out of a spiral notebook. */
export function FounderNote({ content = FOUNDER_NOTE }: { content?: FounderNoteContent }) {
  const { heading, paragraphs, signOff, author } = content;

  return (
    <section className="bg-butter">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-12 md:px-8 md:pt-[60px] lg:pb-[133px] lg:pl-[113px] lg:pr-[94px]">
        <Reveal>
          <h2 className="fluid-heading text-center font-display font-bold text-ink">{heading}</h2>
        </Reveal>

        <Reveal className="mt-10 lg:mt-[62px]">
          <article className="notebook-holes relative rounded-xl bg-sheet py-9 pl-[52px] pr-6 text-[17px] font-semibold leading-[1.65] text-ink shadow-[0_8px_24px_-8px_rgba(77,63,50,0.3)] [overflow-wrap:anywhere] md:rounded-none md:py-[52px] md:pl-[84px] md:pr-10 md:font-bold md:leading-[1.3] md:shadow-[6px_0_0_0_#96917c] md:[overflow-wrap:normal] lg:pb-[85px] lg:pl-[100px] lg:pr-[66px] lg:pt-[70px] lg:text-[22.77px]">
            <div className="flex flex-col gap-[30px] md:gap-[1.3em]">
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

function renderRuns(runs: readonly Run[]) {
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
