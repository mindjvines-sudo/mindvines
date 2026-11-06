import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";

import { Reveal } from "@/components/animations/Reveal";
import { AGE_GROUPS, SECTION_IDS } from "@/lib/content";
import { cn } from "@/lib/utils";
import { listPublishedAgeGroups } from "@/services/age-group.service";
import { getAgeGroupsHeading } from "@/services/settings.service";
import { asPopulatedMedia } from "@/types/media";

type AgeGroupCard = {
  key: string;
  title: string;
  subtitle: string;
  body: string;
  href: string;
  image: { src: string; alt: string } | null;
};

const BUILT_IN_CARDS: AgeGroupCard[] = AGE_GROUPS.groups.map((group) => ({
  key: group.href,
  title: group.title,
  subtitle: group.subtitle,
  body: group.body,
  href: group.href,
  image: { src: group.image.src, alt: group.image.alt },
}));

/**
 * Stone cards, each linking through to that age group's page. The cards and
 * heading come from Admin → Age Groups; until one is published (or if the
 * database can't be reached) the built-in Ages 6–8 and 9–12 cards show.
 */
export async function AgeGroups() {
  await connection();
  let heading = "";
  let cards = BUILT_IN_CARDS;
  try {
    const [groups, savedHeading] = await Promise.all([listPublishedAgeGroups(), getAgeGroupsHeading()]);
    heading = savedHeading;
    if (groups.length > 0) {
      cards = groups.map((group) => {
        const media = asPopulatedMedia(group.cardImage) ?? asPopulatedMedia(group.hero?.image);
        return {
          key: group._id.toString(),
          title: group.title,
          subtitle: group.subtitle ?? "",
          body: group.summary ?? "",
          href: `/age-groups/${group.slug}`,
          image: media ? { src: media.secureUrl, alt: media.altText ?? "" } : null,
        };
      });
    }
  } catch {
    // Fall back to the built-in cards rather than lose the section.
  }

  return (
    <AgeGroupsLayout heading={heading || AGE_GROUPS.heading} count={cards.length}>
      {cards.map((card, index) => (
        <Reveal key={card.key} delay={index * 0.1} className="h-full">
          <Link
            href={card.href}
            className="group flex h-full flex-col items-center rounded-[40px] bg-stone px-6 pb-[60px] pt-[67px] text-center text-ink underline underline-offset-[4px] shadow-card transition-transform duration-300 hover:-translate-y-1"
          >
            {card.image && (
              <div className="relative aspect-[368/362] w-full max-w-[368px] overflow-hidden rounded-[24px]">
                <Image
                  src={card.image.src}
                  alt={card.image.alt}
                  fill
                  sizes="(min-width: 768px) 368px, 90vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
            )}
            <h3 className={cn("font-display text-[34px] font-semibold leading-tight lg:text-[40px]", card.image && "mt-[36px]")}>{card.title}</h3>
            {card.subtitle && (
              <p className="mt-[18px] font-display text-[20px] font-semibold leading-tight lg:text-[22.77px]">{card.subtitle}</p>
            )}
            {card.body && <p className="mt-[24px] max-w-[390px] text-[18px] font-bold leading-[1.33] text-tan xl:text-[20.5px]">{card.body}</p>}
          </Link>
        </Reveal>
      ))}
    </AgeGroupsLayout>
  );
}

/** Holds the section's space while the cards load. */
export function AgeGroupsLoading() {
  return (
    <AgeGroupsLayout heading={AGE_GROUPS.heading} count={2} busy>
      {BUILT_IN_CARDS.map((card) => (
        <div key={card.key} className="min-h-[640px] rounded-[40px] bg-stone/60 shadow-card" />
      ))}
    </AgeGroupsLayout>
  );
}

function AgeGroupsLayout({
  heading,
  count,
  busy,
  children,
}: {
  heading: string;
  count: number;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={SECTION_IDS.ageGroups} aria-busy={busy || undefined} className="bg-paper">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-[51px] sm:px-8 lg:pb-[160px]">
        <Reveal>
          <h2 className="fluid-heading text-center font-display font-bold text-ink">{heading}</h2>
        </Reveal>

        {/* Two cards sit wide apart, as designed; three or more share the row. */}
        <div
          className={cn(
            "mx-auto mt-10 grid gap-8 lg:mt-[72px]",
            count === 1 && "max-w-[566px]",
            count === 2 && "max-w-[1148px] md:grid-cols-2 lg:gap-[116px]",
            count >= 3 && "max-w-[1296px] md:grid-cols-2 lg:grid-cols-3 lg:gap-10",
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
