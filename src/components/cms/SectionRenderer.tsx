import Link from "next/link";
import { cn } from "@/lib/utils";
import { videoSource } from "@/lib/cms/sanitize";
import type { AnySection, Background, Button, ImageRef, PageContent, Padding } from "@/lib/cms/sections";

/**
 * Draws a page's sections. Everything it receives has already been validated
 * and sanitised on the server (`sections.schema.ts`), so the HTML fields are
 * safe to render; this component still never builds markup from anything else.
 */

const BACKGROUND: Record<Background, string> = { none: "bg-paper text-ink", cream: "bg-cream text-ink", tan: "bg-butter text-ink", ink: "bg-ink text-cream" };
const PADDING: Record<Padding, string> = { none: "py-0", sm: "py-8 lg:py-10", md: "py-12 lg:py-16", lg: "py-16 lg:py-24" };
const VISIBILITY = { all: "", desktop: "hidden md:block", mobile: "md:hidden" } as const;

const PROSE =
  "max-w-none text-[17px] leading-[1.7] lg:text-[18px] [&_a]:text-blue [&_a]:underline [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-[28px] [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-[21px] [&_h3]:font-bold [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-2xl [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-tan [&_blockquote]:pl-4 [&_iframe]:aspect-video [&_iframe]:w-full [&_iframe]:rounded-2xl [&_table]:w-full";

function Heading({ text, sub, dark }: { text: string; sub?: string; dark: boolean }) {
  if (!text && !sub) return null;
  return (
    <div className="mb-8 lg:mb-10">
      {text && <h2 className="font-display text-[30px] font-semibold leading-tight lg:text-[42px]">{text}</h2>}
      {sub && <p className={cn("mt-2 text-lg", dark ? "text-cream/80" : "text-cocoa")}>{sub}</p>}
    </div>
  );
}

function Img({ image, className }: { image: ImageRef; className?: string }) {
  if (!image.url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- sizes are set by the section's layout
  return <img src={image.url} alt={image.alt} loading="lazy" className={cn("h-auto w-full rounded-2xl object-cover", className)} />;
}

function Buttons({ buttons, center, dark }: { buttons: Button[]; center: boolean; dark: boolean }) {
  if (buttons.length === 0) return null;
  return (
    <div className={cn("mt-6 flex flex-wrap gap-3", center && "justify-center")}>
      {buttons.map((button, index) => {
        const className = cn(
          "inline-flex min-h-11 items-center rounded-full px-6 py-2.5 font-ui text-[16px] font-semibold transition-opacity hover:opacity-90",
          index === 0 ? (dark ? "bg-cream text-ink" : "bg-ink text-cream") : dark ? "border-2 border-cream text-cream" : "border-2 border-ink text-ink",
        );
        const external = /^https?:\/\//i.test(button.url);
        return external ? (
          <a key={button.url + index} href={button.url} className={className} target="_blank" rel="noopener noreferrer">{button.text}</a>
        ) : (
          <Link key={button.url + index} href={button.url} className={className}>{button.text}</Link>
        );
      })}
    </div>
  );
}

function Body({ section }: { section: AnySection }) {
  const dark = section.style.background === "ink";
  const center = section.style.align === "center";
  const align = center ? "text-center" : "text-left";

  switch (section.type) {
    case "hero": {
      const d = section.data;
      return (
        <div className={cn("grid items-center gap-8 lg:gap-12", d.image.url && "lg:grid-cols-2", align)}>
          <div>
            {d.subheading && <p className="mb-2 font-label text-sm font-bold uppercase tracking-wide text-tan">{d.subheading}</p>}
            <h1 className="font-display text-[36px] font-semibold leading-[1.1] lg:text-[56px]">{d.heading}</h1>
            {d.description && <p className="mt-4 text-[18px] leading-[1.65] lg:text-[20px]">{d.description}</p>}
            <Buttons buttons={d.buttons} center={center && !d.image.url} dark={dark} />
          </div>
          <Img image={d.image} className="aspect-[4/3]" />
        </div>
      );
    }
    case "richText":
      return (
        <div className={align}>
          <Heading text={section.data.heading} dark={dark} />
          <div className={cn(PROSE, "text-left")} dangerouslySetInnerHTML={{ __html: section.data.html }} />
        </div>
      );
    case "textImage": {
      const d = section.data;
      const imageFirst = section.style.imageSide === "left";
      return (
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className={cn(imageFirst && "lg:order-2", section.style.mobileImageFirst && "order-2 lg:order-none", imageFirst && section.style.mobileImageFirst && "lg:order-2")}>
            {d.heading && <h2 className="font-display text-[30px] font-semibold leading-tight lg:text-[40px]">{d.heading}</h2>}
            {d.subheading && <p className="mt-2 text-lg text-cocoa">{d.subheading}</p>}
            {d.text && <p className="mt-4 whitespace-pre-line text-[17px] leading-[1.7] lg:text-[18px]">{d.text}</p>}
            <Buttons buttons={d.buttons} center={false} dark={dark} />
          </div>
          <div className={cn(imageFirst && "lg:order-1", section.style.mobileImageFirst && "order-1 lg:order-none", imageFirst && section.style.mobileImageFirst && "lg:order-1")}>
            <Img image={d.image} className="aspect-[4/3]" />
          </div>
        </div>
      );
    }
    case "gallery": {
      const d = section.data;
      const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[section.style.columns];
      return (
        <div className={align}>
          <Heading text={d.heading} sub={d.description} dark={dark} />
          <div className={cn("grid grid-cols-1 gap-4", cols)}>
            {d.images.map((image, index) => <Img key={image.url + index} image={image} className="aspect-square" />)}
          </div>
        </div>
      );
    }
    case "video": {
      const d = section.data;
      const source = videoSource(d.url);
      return (
        <div className={align}>
          <Heading text={d.heading} sub={d.description} dark={dark} />
          {source?.kind === "iframe" && (
            <iframe src={source.src} title={d.heading || "Video"} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="aspect-video w-full rounded-2xl" />
          )}
          {source?.kind === "file" && <video src={source.src} controls preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />}
        </div>
      );
    }
    case "features": {
      const d = section.data;
      const cols = { 2: "md:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3", 4: "md:grid-cols-2 lg:grid-cols-4" }[section.style.columns];
      return (
        <div className={align}>
          <Heading text={d.heading} sub={d.subheading} dark={dark} />
          <div className={cn("grid grid-cols-1 gap-5", cols)}>
            {d.items.map((item, index) => (
              <div key={index} className={cn("rounded-3xl p-6 text-left", dark ? "bg-cream/10" : "bg-card shadow-card")}>
                {item.icon && <div className="mb-3 text-3xl" aria-hidden>{item.icon}</div>}
                <h3 className="font-display text-[22px] font-semibold">{item.title}</h3>
                <p className="mt-2 leading-[1.65]">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "stats": {
      const d = section.data;
      return (
        <div className={align}>
          <Heading text={d.heading} dark={dark} />
          <dl className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4">
            {d.items.map((item, index) => (
              <div key={index} className="flex flex-col">
                <dt className="order-2 mt-1 text-base">{item.label}</dt>
                <dd className="font-display text-[40px] font-semibold leading-none lg:text-[56px]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    }
    case "faq": {
      const d = section.data;
      return (
        <div className={cn("mx-auto max-w-[860px]", align)}>
          <Heading text={d.heading} dark={dark} />
          <div className="space-y-3 text-left">
            {d.items.map((item, index) => (
              <details key={index} className={cn("group rounded-2xl p-5", dark ? "bg-cream/10" : "bg-card")}>
                <summary className="cursor-pointer list-none font-bold marker:hidden">{item.question}</summary>
                <p className="mt-3 whitespace-pre-line leading-[1.65]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      );
    }
    case "cta": {
      const d = section.data;
      return (
        <div className={cn("mx-auto max-w-[760px]", align)}>
          <h2 className="font-display text-[32px] font-semibold leading-tight lg:text-[44px]">{d.heading}</h2>
          {d.description && <p className="mt-3 text-[18px] leading-[1.65]">{d.description}</p>}
          <Buttons buttons={d.buttons} center={center} dark={dark} />
        </div>
      );
    }
    case "contactInfo": {
      const d = section.data;
      return (
        <div className={align}>
          <Heading text={d.heading} sub={d.description} dark={dark} />
          <ul className="space-y-2 text-[17px]">
            {d.email && <li><span className="font-bold">Email: </span><a className="underline" href={`mailto:${d.email}`}>{d.email}</a></li>}
            {d.phone && <li><span className="font-bold">Phone: </span><a className="underline" href={`tel:${d.phone.replace(/[^\d+]/g, "")}`}>{d.phone}</a></li>}
            {d.address && <li className="whitespace-pre-line"><span className="font-bold">Address: </span>{d.address}</li>}
            {d.hours && <li className="whitespace-pre-line"><span className="font-bold">Hours: </span>{d.hours}</li>}
          </ul>
        </div>
      );
    }
    case "html":
      return <div className={PROSE} dangerouslySetInnerHTML={{ __html: section.data.html }} />;
    case "component":
      return null; // drawn by PageBody
    case "spacer": {
      const height = { sm: "h-6", md: "h-12", lg: "h-24" }[section.data.size];
      return section.data.divider ? <hr className="border-t-2 border-stone" /> : <div className={height} aria-hidden />;
    }
  }
}

export function SectionRenderer({ section, template }: { section: AnySection; template: PageContent["template"] }) {
  if (section.visible === false) return null;
  const style = section.style;
  const narrow = template === "NARROW";
  return (
    <section
      id={`section-${section.id}`}
      className={cn(BACKGROUND[style.background], section.type === "spacer" ? "py-0" : template === "LANDING" ? PADDING[style.padding].replace("lg:py-24", "lg:py-16") : PADDING[style.padding], VISIBILITY[style.devices])}
    >
      <div className={cn("mx-auto w-full px-5", narrow ? "max-w-[860px]" : "max-w-[1180px]")}>
        <Body section={section} />
      </div>
    </section>
  );
}
