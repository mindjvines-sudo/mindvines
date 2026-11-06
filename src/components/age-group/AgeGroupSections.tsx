import Image from "next/image";

import { Reveal, StaggerGroup, StaggerItem } from "@/components/animations/Reveal";
import { Carousel } from "@/components/age-group/Carousel";
import { GalleryTabs } from "@/components/age-group/GalleryTabs";
import { PlanTabs, type PlanOption } from "@/components/age-group/PlanTabs";
import { PillButton } from "@/components/ui/PillButton";
import { REGISTER_HREF, SECTION_IDS, type PlansSectionContent, type TopicGroup } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * The sections of an age group's page (/age-groups/[slug]), laid out after
 * mindvines.in/blank-5: the group's badge over a grid of topic images, then
 * the plan switcher on a tan band. Collections of alternating photo-and-text
 * rows, a stats band, a tabbed gallery and testimonials show when filled in.
 * Light sections take their background from the page, which alternates them.
 */

export type Photo = { src: string; alt: string };
export type Slide = { photo: Photo; caption: string };
type Tone = string;

const CONTAINER = "mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-[72px]";
const SECTION_SPACE = "py-16 lg:py-[110px]";
/** The reference page's own heading size, a step below the homepage's. */
const PAGE_HEADING = "text-center font-display text-[30px] font-bold leading-[1.1] sm:text-[38px] lg:text-[45.5px]";

function Cover({ photo, sizes, className, priority }: { photo: Photo; sizes: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-stone", className)}>
      <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" />
    </div>
  );
}

/** `onDark` sets the heading in butter, for the photo bands. */
function SectionHeading({ children, className, onDark }: { children: React.ReactNode; className?: string; onDark?: boolean }) {
  return (
    <h2 className={cn("fluid-heading text-center font-display font-bold", onDark ? "text-butter" : "text-ink", className)}>{children}</h2>
  );
}

const BADGE =
  "flex min-h-[47px] w-full items-center justify-center rounded-full bg-amber px-6 py-2 text-center font-label text-[17px] font-bold leading-[1.1] text-paper sm:w-auto sm:px-[39px] lg:text-[20.25px]";

const NOTE =
  "flex min-h-[64px] items-center justify-center rounded-[27px] border border-[#8b8075] bg-butter px-6 py-3 text-center text-[17px] font-bold leading-[1.3] text-ink lg:min-h-[102px] lg:items-start lg:pt-[25px] lg:text-[27.32px]";

type Topics = {
  heading: string;
  intro: string;
  slides: Slide[];
  /** Several badged sets of covers, as on the Ages 9–12 page; they take the place of `slides`. */
  groups?: TopicGroup[];
  note: string;
  cta: { label: string; href: string } | null;
};

/**
 * The page's opening: an amber badge naming the group, then a grid of topic
 * images under a zigzag rule, closed by a butter note. Without topics the
 * badge stands alone. A page whose topics come in groups opens on the heading
 * instead, each group under its own badge.
 */
export function AgeGroupTopics({ badge, topics }: { badge: string; topics: Topics | null }) {
  if (topics?.groups?.length) return <GroupedTopics topics={topics} groups={topics.groups} />;

  return (
    <section id={SECTION_IDS.topics} className="scroll-mt-24 bg-cream lg:scroll-mt-32">
      <div className={cn(CONTAINER, "pb-16 pt-[27px] lg:pb-[160px]")}>
        <Reveal y={12} className="flex justify-center">
          <h1 className={BADGE}>{badge}</h1>
        </Reveal>

        {topics && (
          <>
            {(topics.heading || topics.intro) && (
              <Reveal className="mt-12 text-center lg:mt-[69px]">
                {topics.heading && <h2 className={cn(PAGE_HEADING, "text-ink")}>{topics.heading}</h2>}
                {topics.intro && (
                  <p className="mx-auto mt-4 max-w-[839px] whitespace-pre-line text-[17px] font-bold leading-[1.3] text-ink lg:mt-[22px] lg:text-[22.77px]">
                    {topics.intro}
                  </p>
                )}
                <div aria-hidden className="zigzag-rule mx-auto mt-6 w-[197px] lg:mt-[26px]" />
              </Reveal>
            )}

            <StaggerGroup
              as="ul"
              className="mx-auto mt-10 grid max-w-[952px] grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-10 sm:gap-y-12 lg:mt-12 lg:gap-x-[86px] lg:gap-y-[94px]"
            >
              {topics.slides.map((slide, index) => (
                <StaggerItem key={index} as="li">
                  <figure>
                    <div className="relative aspect-[433/472] overflow-hidden rounded-[22px] border border-amber bg-white lg:rounded-[34px]">
                      <Image
                        src={slide.photo.src}
                        alt={slide.photo.alt}
                        fill
                        sizes="(min-width: 1024px) 433px, 45vw"
                        loading={index < 2 ? "eager" : undefined}
                        className="object-contain p-[2%]"
                      />
                    </div>
                    {slide.caption && (
                      <figcaption className="mt-3 text-center text-[16px] font-bold leading-snug text-tan lg:text-[19px]">{slide.caption}</figcaption>
                    )}
                  </figure>
                </StaggerItem>
              ))}
            </StaggerGroup>

            {topics.note && (
              <Reveal className="mx-auto mt-10 max-w-[930px] lg:mt-[65px]">
                <p className={NOTE}>{topics.note}</p>
              </Reveal>
            )}

            {topics.cta && (
              <div className="mt-10 flex justify-center lg:mt-12">
                <PillButton href={topics.cta.href}>{topics.cta.label}</PillButton>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** mindvines.in/blank-5-1-1: heading and rule, then each badge over its covers in white frames. */
function GroupedTopics({ topics, groups }: { topics: Topics; groups: TopicGroup[] }) {
  return (
    <section id={SECTION_IDS.topics} className="scroll-mt-24 bg-cream lg:scroll-mt-32">
      <div className={cn(CONTAINER, "pb-16 pt-12 lg:pb-[100px] lg:pt-[75px]")}>
        <Reveal className="text-center">
          <h1 className={cn(PAGE_HEADING, "text-ink")}>{topics.heading}</h1>
          {topics.intro && (
            <p className="mx-auto mt-5 max-w-[640px] whitespace-pre-line text-[17px] font-bold leading-[1.3] text-ink lg:mt-[42px] lg:text-[22.77px]">
              {topics.intro}
            </p>
          )}
          <div aria-hidden className="zigzag-rule mx-auto mt-6 w-[197px] lg:mt-[34px]" />
        </Reveal>

        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className={groupIndex === 0 ? "mt-7 lg:mt-[29px]" : "mt-16 lg:mt-[140px]"}>
            <Reveal y={12} className="flex justify-center">
              <h2 className={BADGE}>{group.badge}</h2>
            </Reveal>
            <StaggerGroup
              as="ul"
              className="mx-auto mt-8 grid max-w-[1052px] grid-cols-2 gap-x-4 gap-y-6 sm:gap-x-10 sm:gap-y-12 lg:mt-[63px] lg:gap-x-[152px] lg:gap-y-[105px]"
            >
              {group.images.map((image, index) => (
                <StaggerItem key={index} as="li" className="flex">
                  <div className="flex w-full items-center justify-center border border-[#ffdcf1] bg-white p-[5%] lg:p-[22px]">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="(min-width: 1024px) 404px, 42vw"
                      loading={groupIndex === 0 && index < 2 ? "eager" : undefined}
                      className={cn("h-auto w-full", image.outlined && "border border-dotted border-[#252525]")}
                    />
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        ))}

        {topics.note && (
          <Reveal className="mx-auto mt-10 max-w-[921px] lg:mt-[60px]">
            <p className={NOTE}>{topics.note}</p>
          </Reveal>
        )}

        {topics.cta && (
          <div className="mt-10 flex justify-center lg:mt-12">
            <PillButton href={topics.cta.href}>{topics.cta.label}</PillButton>
          </div>
        )}
      </div>
    </section>
  );
}

export function AgeGroupCollection({
  tone,
  heading,
  subheading,
  tags,
  items,
}: {
  tone: Tone;
  heading: string;
  subheading: string;
  tags: string[];
  items: { title: string; body: string; photo: Photo | null }[];
}) {
  return (
    <section className={tone}>
      <div className={cn(CONTAINER, SECTION_SPACE)}>
        <Reveal className="text-center">
          <SectionHeading>{heading}</SectionHeading>
          {subheading && <p className="mt-4 text-[20px] font-bold leading-tight text-amber lg:mt-5 lg:text-[24px]">{subheading}</p>}
          {tags.length > 0 && (
            <ul className="mt-7 flex flex-wrap justify-center gap-3">
              {tags.map((tag) => (
                <li key={tag} className="rounded-full bg-stone px-5 py-2 text-[15px] font-bold leading-tight text-tan lg:text-[17px]">
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </Reveal>

        {items.length > 0 && (
          <div className="mt-12 flex flex-col gap-14 lg:mt-20 lg:gap-24">
            {items.map((item, index) => {
              const flipped = index % 2 === 1;
              return (
                <Reveal
                  key={index}
                  as="article"
                  className={cn(
                    "grid items-center gap-7",
                    item.photo &&
                      (flipped
                        ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16"
                        : "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16"),
                  )}
                >
                  {item.photo && (
                    <Cover
                      photo={item.photo}
                      sizes="(min-width: 1024px) 56vw, 100vw"
                      className={cn("aspect-[4/3] rounded-[32px] lg:aspect-[16/11]", flipped && "lg:order-2")}
                    />
                  )}
                  <div className={cn(item.photo ? "max-w-[520px]" : "mx-auto max-w-[720px] text-center")}>
                    <h3 className="font-display text-[30px] font-semibold leading-[1.15] text-ink lg:text-[40px]">{item.title}</h3>
                    {item.body && (
                      <p className="mt-4 whitespace-pre-line text-[18px] font-bold leading-[1.4] text-tan lg:mt-5 lg:text-[20.5px]">{item.body}</p>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

const STAT_COLUMNS: Record<number, string> = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "lg:grid-cols-4" };

export function AgeGroupStats({
  heading,
  photo,
  items,
}: {
  heading: string;
  photo: Photo | null;
  items: { value: string; label: string }[];
}) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-paper">
      {photo && (
        <>
          <Image src={photo.src} alt="" fill sizes="100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-ink/80" />
        </>
      )}
      <div className={cn(CONTAINER, "py-20 text-center lg:py-[120px]")}>
        {heading && (
          <Reveal>
            <SectionHeading onDark className="mx-auto max-w-[780px]">{heading}</SectionHeading>
          </Reveal>
        )}
        <StaggerGroup
          as="ul"
          className={cn("mx-auto grid max-w-[1100px] grid-cols-2 gap-x-6 gap-y-10", STAT_COLUMNS[items.length], heading && "mt-12 lg:mt-16")}
        >
          {items.map((stat, index) => (
            <StaggerItem key={index} as="li" className={cn(items.length === 1 && "col-span-2")}>
              <p className="font-display text-[48px] font-semibold leading-none tabular-nums lg:text-[72px]">{stat.value}</p>
              <p className="mt-3 text-[16px] font-bold leading-snug text-stone lg:text-[19px]">{stat.label}</p>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}

function formatRupees(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function Static({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

/**
 * The plan switcher on its tan band, every word of it from the admin.
 * `animate={false}` drops the scroll-in fade, for bands that are swapped in
 * on demand and should appear at once.
 */
export function AgeGroupPricing({
  heading,
  intro,
  items,
  priceNote,
  footnote,
  id = "plans",
  animate = true,
}: PlansSectionContent & { id?: string; animate?: boolean }) {
  const Wrap = animate ? Reveal : Static;
  const plans: PlanOption[] = items.map((item) => ({
    tab: item.tab,
    cards: item.cards.map((card) => ({
      title: card.title,
      price: formatRupees(card.price),
      period: card.period,
      badge: card.badge,
      highlight: card.highlight,
      buttonLabel: card.buttonLabel || "Subscribe now",
      buttonHref: card.buttonHref || REGISTER_HREF,
    })),
  }));

  const sideBySide = plans.some((plan) => plan.cards.length > 1);

  return (
    <section id={id} className="scroll-mt-36 bg-tan">
      <div className={cn(CONTAINER, "pb-16 pt-12 lg:pb-[124px] lg:pt-[63px]")}>
        <Wrap className="mx-auto max-w-[835px]">
          {/* mindvines.in sets the side-by-side plans (Ages 9–12) under a brown heading, a single plan (Ages 6–8) under a near-black one. */}
          <h2 className={cn(PAGE_HEADING, sideBySide ? "text-ink" : "text-[#252525]")}>{heading}</h2>
          {intro && (
            <p className="mt-6 whitespace-pre-line text-[17px] font-bold leading-[1.3] text-ink sm:text-center lg:mt-[56px] lg:text-[20.49px]">
              {intro}
            </p>
          )}
        </Wrap>
        <Wrap className={cn("mt-10", intro || !sideBySide ? "lg:mt-[46px]" : "lg:mt-[23px]")}>
          <PlanTabs label={heading} plans={plans} priceNote={priceNote} footnote={footnote} />
        </Wrap>
      </div>
    </section>
  );
}

export function AgeGroupGallery({ tone, heading, tabs }: { tone: Tone; heading: string; tabs: { label: string; slides: Slide[] }[] }) {
  return (
    <section className={tone}>
      <div className={cn(CONTAINER, SECTION_SPACE)}>
        {heading && (
          <Reveal>
            <SectionHeading className="mb-10 lg:mb-14">{heading}</SectionHeading>
          </Reveal>
        )}
        <GalleryTabs
          label={heading || "Gallery"}
          tabs={tabs.map((tab) => ({
            label: tab.label,
            content: (
              <Carousel label={tab.label} slideClassName="w-[88%] lg:w-[74%]">
                {tab.slides.map((slide, index) => (
                  <figure key={index}>
                    <Cover photo={slide.photo} sizes="(min-width: 1024px) 74vw, 88vw" className="aspect-[16/10] rounded-[32px]" />
                    {slide.caption && <figcaption className="mt-4 text-[17px] font-bold leading-snug text-tan lg:text-[19px]">{slide.caption}</figcaption>}
                  </figure>
                ))}
              </Carousel>
            ),
          }))}
        />
      </div>
    </section>
  );
}

export function AgeGroupTestimonials({
  tone,
  heading,
  items,
}: {
  tone: Tone;
  heading: string;
  items: { name: string; detail: string; quote: string; rating: number | null; photo: Photo | null }[];
}) {
  return (
    <section className={tone}>
      <div className={cn(CONTAINER, SECTION_SPACE)}>
        <Reveal>
          <SectionHeading>{heading}</SectionHeading>
        </Reveal>
        <Carousel label={heading} className="mt-10 lg:mt-14" slideClassName="w-[85%] sm:w-[46%] lg:w-[calc((100%-48px)/3)]">
          {items.map((item, index) => (
            <figure key={index} className="flex h-full flex-col items-center rounded-[28px] bg-stone px-7 pb-8 pt-9 text-center">
              {item.photo ? (
                <Cover photo={{ ...item.photo, alt: "" }} sizes="72px" className="size-[72px] rounded-full" />
              ) : (
                <span aria-hidden className="grid size-[72px] place-items-center rounded-full bg-amber font-display text-[28px] font-semibold text-ink">
                  {item.name.charAt(0).toUpperCase()}
                </span>
              )}
              <figcaption className="mt-4">
                <p className="font-display text-[21px] font-semibold leading-tight text-ink">{item.name}</p>
                {item.detail && <p className="mt-1 text-[15px] font-bold text-tan">{item.detail}</p>}
              </figcaption>
              <blockquote className="mt-4 whitespace-pre-line text-[17px] leading-[1.5] text-ink">“{item.quote}”</blockquote>
              {item.rating ? (
                <p className="mt-auto pt-5 text-[20px] tracking-[0.2em]">
                  <span className="sr-only">Rated {item.rating} out of 5</span>
                  <span aria-hidden className="text-amber">{"★".repeat(item.rating)}</span>
                  <span aria-hidden className="text-ink/15">{"★".repeat(5 - item.rating)}</span>
                </p>
              ) : null}
            </figure>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
