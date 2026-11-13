import { parseLegalBody, type LegalDocument } from "@/lib/legal-content";

/** A policy page: the title, then its sections, headings and lists. */
export function LegalPage({ document }: { document: LegalDocument }) {
  const blocks = parseLegalBody(document.body);
  return (
    <main className="mx-auto w-full max-w-[860px] px-5 py-12 text-ink lg:py-16">
      <h1 className="font-display text-[34px] font-semibold leading-tight lg:text-[46px]">{document.title}</h1>
      <div className="mt-8 space-y-4 text-[17px] leading-[1.7] lg:text-[18px]">
        {blocks.map((block, index) => {
          if (block.type === "h2") return <h2 key={index} className="!mt-10 font-display text-[24px] font-semibold leading-snug lg:text-[28px]">{block.text}</h2>;
          if (block.type === "h3") return <h3 key={index} className="!mt-6 text-[19px] font-bold">{block.text}</h3>;
          if (block.type === "ul") {
            return (
              <ul key={index} className="list-disc space-y-1.5 pl-6 marker:text-tan">
                {block.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            );
          }
          return <p key={index}>{block.text}</p>;
        })}
      </div>
    </main>
  );
}
