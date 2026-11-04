import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import {
  AgeGroupCollection,
  AgeGroupGallery,
  AgeGroupPricing,
  AgeGroupStats,
  AgeGroupTestimonials,
  AgeGroupTopics,
  type Photo,
  type Slide,
} from "@/components/age-group/AgeGroupSections";
import { siteConfig } from "@/config/site";
import { AGE_GROUP_PAGES, type PlansSectionContent } from "@/lib/content";
import { toPlanOptions } from "@/lib/plan-options";
import { buildMetadata } from "@/lib/seo";
import { getPublishedAgeGroupBySlug } from "@/services/age-group.service";
import { listPublishedSubscriptionPlansForAge } from "@/services/subscription.service";
import { asPopulatedMedia } from "@/types/media";

type Props = { params: Promise<{ slug: string }> };

/** Shared by the page and its metadata, so the group is fetched once per request. */
const getAgeGroup = cache(async (slug: string) => {
  await connection();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return getPublishedAgeGroupBySlug(slug);
});

function toPhoto(value: unknown): Photo | null {
  const media = asPopulatedMedia(value);
  return media ? { src: media.secureUrl, alt: media.altText ?? "" } : null;
}

/** Slides whose image was since deleted from the library are skipped. */
function toSlides(list: { image?: unknown; caption?: string | null }[] = []): Slide[] {
  return list.flatMap((slide) => {
    const photo = toPhoto(slide.image);
    return photo ? [{ photo, caption: slide.caption ?? "" }] : [];
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getAgeGroup(slug);
  if (!group) return {};

  return buildMetadata(
    {
      title: group.seo?.title,
      description: group.seo?.description,
      canonical: `${siteConfig.url}/age-groups/${group.slug}`,
      ogImage: toPhoto(group.hero?.image)?.src ?? toPhoto(group.cardImage)?.src,
    },
    { title: group.title, description: group.summary || group.subtitle || undefined }
  );
}

export default async function AgeGroupPage({ params }: Props) {
  const { slug } = await params;
  const group = await getAgeGroup(slug);
  if (!group) notFound();

  const builtIn = AGE_GROUP_PAGES[group.slug];

  // Light sections alternate paper and cream down the page, whichever show.
  let lightSections = 0;
  const nextTone = () => (lightSections++ % 2 === 0 ? "bg-paper" : "bg-cream");

  // Topics and plans each come from the admin once it has saved topic images
  // or plans; until then this page's built-in ones stand in, if any.
  const topicSlides = toSlides(group.highlights?.slides);
  const cta = group.highlights?.cta;
  const topics =
    topicSlides.length > 0
      ? {
          heading: group.highlights?.heading ?? "",
          intro: group.highlights?.intro ?? "",
          slides: topicSlides,
          note: group.highlights?.note ?? "",
          cta: cta?.label && cta.href ? { label: cta.label, href: cta.href } : null,
        }
      : builtIn
        ? { ...builtIn.topics, slides: builtIn.topics.images.map((photo) => ({ photo, caption: "" })), cta: null }
        : null;
  const planAge = group.plans?.ageGroup ?? "";
  const livePlans = group.plans?.show !== false && planAge ? await listPublishedSubscriptionPlansForAge(planAge) : [];
  const pricing: PlansSectionContent | null =
    livePlans.length > 0
      ? {
          heading: group.plans?.heading || "Choose your subscription plan",
          intro: group.plans?.intro ?? "",
          items: toPlanOptions(livePlans),
          // Checkout always adds GST, so the band says so unless the admin words it differently.
          priceNote: group.plans?.priceNote || "plus GST",
          footnote: group.plans?.footnote || "Switch or cancel anytime",
        }
      : null;

  const stats = (group.stats?.items ?? []).filter((stat) => stat.value && stat.label);
  const galleryTabs = (group.gallery?.tabs ?? [])
    .map((tab) => ({ label: tab.label ?? "", slides: toSlides(tab.slides) }))
    .filter((tab) => tab.label && tab.slides.length > 0);
  const testimonials = (group.testimonials?.items ?? []).filter((item) => item.name && item.quote);

  return (
    <>
      <AgeGroupTopics badge={[group.title, group.subtitle].filter(Boolean).join("  · ")} topics={topics} />

      {group.collections.map((collection, index) => (
        <AgeGroupCollection
          key={index}
          tone={nextTone()}
          heading={collection.heading ?? ""}
          subheading={collection.subheading ?? ""}
          tags={collection.tags}
          items={collection.items
            .filter((item) => item.title)
            .map((item) => ({ title: item.title ?? "", body: item.body ?? "", photo: toPhoto(item.image) }))}
        />
      ))}

      {stats.length > 0 && (
        <AgeGroupStats
          heading={group.stats?.heading ?? ""}
          photo={toPhoto(group.stats?.image)}
          items={stats.map((stat) => ({ value: stat.value ?? "", label: stat.label ?? "" }))}
        />
      )}

      {galleryTabs.length > 0 && (
        <AgeGroupGallery tone={nextTone()} heading={group.gallery?.heading ?? ""} tabs={galleryTabs} />
      )}

      {testimonials.length > 0 && (
        <AgeGroupTestimonials
          tone={nextTone()}
          heading={group.testimonials?.heading || "What parents say"}
          items={testimonials.map((item) => ({
            name: item.name ?? "",
            detail: item.detail ?? "",
            quote: item.quote ?? "",
            rating: item.rating ?? null,
            photo: toPhoto(item.image),
          }))}
        />
      )}

      {pricing && <AgeGroupPricing {...pricing} />}
    </>
  );
}
