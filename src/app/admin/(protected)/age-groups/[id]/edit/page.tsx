import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { getAgeGroupByIdAdmin } from "@/services/age-group.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { asPopulatedMedia, type MediaItem } from "@/types/media";
import { AgeGroupForm, type AgeGroupFormDefaults } from "../../age-group-form";
import { setAgeGroupStatusAction, updateAgeGroupAction } from "../../actions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { ButtonLink } from "@/components/admin/ui/button";
import { ActionButton } from "@/components/admin/ui/confirm-action";
import { CheckCircleIcon, ExternalLinkIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Edit Age Group" };

/** Populated Media documents are serialised so they can cross into the client form. */
const plainMedia = (value: unknown): MediaItem | null =>
  asPopulatedMedia(value) ? JSON.parse(JSON.stringify(value)) : null;

type Slide = { image?: unknown; caption?: string | null };
const slides = (list?: Slide[] | null) => (list ?? []).map((slide) => ({ image: plainMedia(slide.image), caption: slide.caption ?? "" }));

export default async function EditAgeGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const [user, group] = await Promise.all([getCurrentUser(), getAgeGroupByIdAdmin(id)]);
  if (!group) notFound();

  const canPublish = can(user.role, "publish", "ageGroups");

  const defaultValues: AgeGroupFormDefaults = {
    title: group.title,
    slug: group.slug,
    subtitle: group.subtitle ?? "",
    summary: group.summary ?? "",
    cardImage: plainMedia(group.cardImage),
    hero: {
      heading: group.hero?.heading ?? "",
      subheading: group.hero?.subheading ?? "",
      image: plainMedia(group.hero?.image),
    },
    highlights: {
      heading: group.highlights?.heading ?? "",
      intro: group.highlights?.intro ?? "",
      slides: slides(group.highlights?.slides),
      note: group.highlights?.note ?? "",
      cta: { label: group.highlights?.cta?.label ?? "", href: group.highlights?.cta?.href ?? "" },
    },
    collections: group.collections.map((collection) => ({
      heading: collection.heading ?? "",
      subheading: collection.subheading ?? "",
      tags: collection.tags.join(", "),
      items: collection.items.map((item) => ({
        title: item.title ?? "",
        body: item.body ?? "",
        image: plainMedia(item.image),
      })),
    })),
    stats: {
      heading: group.stats?.heading ?? "",
      image: plainMedia(group.stats?.image),
      items: (group.stats?.items ?? []).map((stat) => ({ value: stat.value ?? "", label: stat.label ?? "" })),
    },
    plans: {
      show: group.plans?.show !== false,
      ageGroup: group.plans?.ageGroup ?? "",
      heading: group.plans?.heading ?? "",
      intro: group.plans?.intro ?? "",
      priceNote: group.plans?.priceNote ?? "",
      footnote: group.plans?.footnote ?? "",
    },
    gallery: {
      heading: group.gallery?.heading ?? "",
      tabs: (group.gallery?.tabs ?? []).map((tab) => ({ label: tab.label ?? "", slides: slides(tab.slides) })),
    },
    testimonials: {
      heading: group.testimonials?.heading ?? "",
      items: (group.testimonials?.items ?? []).map((item) => ({
        name: item.name ?? "",
        detail: item.detail ?? "",
        quote: item.quote ?? "",
        rating: item.rating ? String(item.rating) : "",
        image: plainMedia(item.image),
      })),
    },
    seo: { title: group.seo?.title ?? "", description: group.seo?.description ?? "" },
    status: group.status,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/age-groups", label: "All age groups" }}
        title="Edit age group"
        meta={<StatusBadge status={group.status} />}
        description={group.title}
        actions={
          <>
            {group.status === "PUBLISHED" && (
              <ButtonLink href={`/age-groups/${group.slug}`} target="_blank" rel="noopener" variant="secondary">
                <ExternalLinkIcon />
                View on site
              </ButtonLink>
            )}
            {canPublish && group.status !== "PUBLISHED" && (
              <form action={setAgeGroupStatusAction.bind(null, id, "PUBLISHED")}>
                <ActionButton variant="primary" size="md" pendingLabel="Publishing…">
                  <CheckCircleIcon />
                  Publish
                </ActionButton>
              </form>
            )}
            {canPublish && group.status === "PUBLISHED" && (
              <form action={setAgeGroupStatusAction.bind(null, id, "DRAFT")}>
                <ActionButton variant="secondary" size="md" pendingLabel="Updating…">
                  Unpublish
                </ActionButton>
              </form>
            )}
          </>
        }
      />
      {/* Keyed by save time so the form remounts with fresh values after a status change. */}
      <AgeGroupForm
        key={String(group.updatedAt)}
        action={updateAgeGroupAction.bind(null, id)}
        submitLabel="Save changes"
        defaultValues={defaultValues}
      />
    </div>
  );
}
