import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { getLocationByIdAdmin } from "@/services/location.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { asPopulatedMedia } from "@/types/media";
import { LocationForm, type LocationFormDefaults } from "../../location-form";
import { setLocationStatusAction, updateLocationAction } from "../../actions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { ButtonLink } from "@/components/admin/ui/button";
import { ActionButton } from "@/components/admin/ui/confirm-action";
import { CheckCircleIcon, ExternalLinkIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Edit Location" };

/** Populated Media documents are serialised so they can cross into the client form. */
const plainMedia = (value: unknown) => (asPopulatedMedia(value) ? JSON.parse(JSON.stringify(value)) : null);
const title = (value?: { lead?: string | null; accent?: string | null } | null) => ({
  lead: value?.lead ?? "",
  accent: value?.accent ?? "",
});

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const [user, location] = await Promise.all([getCurrentUser(), getLocationByIdAdmin(id)]);
  if (!location) notFound();

  const canPublish = can(user.role, "publish", "locations");

  const defaultValues: LocationFormDefaults = {
    name: location.name,
    slug: location.slug,
    title: location.title,
    eyebrow: location.eyebrow ?? "",
    heading: title(location.heading),
    intro: location.intro ?? "",
    address: {
      street: location.address?.street ?? "",
      area: location.address?.area ?? "",
      city: location.address?.city ?? "",
    },
    phone: location.phone ?? "",
    stats: location.stats.map((stat) => ({ value: stat.value ?? "", label: stat.label ?? "" })),
    approach: {
      title: title(location.approach?.title),
      paragraphs: location.approach?.paragraphs ?? [],
      image: plainMedia(location.approach?.image),
    },
    services: {
      lead: location.services?.lead ?? "",
      accent: location.services?.accent ?? "",
      intro: location.services?.intro ?? "",
    },
    serviceItems: location.serviceItems.map((item) => ({
      title: item.title ?? "",
      description: item.description ?? "",
      href: item.href ?? "",
    })),
    conditionsTitle: title(location.conditionsTitle),
    conditions: location.conditions,
    why: {
      title: title(location.why?.title),
      points: (location.why?.points ?? []).map((point) => ({ title: point.title ?? "", body: point.body ?? "" })),
    },
    corporate: { title: location.corporate?.title ?? "", paragraphs: location.corporate?.paragraphs ?? [] },
    faqTitle: title(location.faqTitle),
    faqs: location.faqs.map((faq) => ({ question: faq.question ?? "", answer: faq.answer ?? "" })),
    bannerImage: plainMedia(location.bannerImage),
    teamImage: plainMedia(location.teamImage),
    corporateImage: plainMedia(location.corporateImage),
    seo: { title: location.seo?.title ?? "", description: location.seo?.description ?? "" },
    status: location.status,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/locations", label: "All locations" }}
        title="Edit location"
        meta={<StatusBadge status={location.status} />}
        description={location.name}
        actions={
          <>
            {location.status === "PUBLISHED" && (
              <ButtonLink href={`/${location.slug}`} target="_blank" rel="noopener" variant="secondary">
                <ExternalLinkIcon />
                View on site
              </ButtonLink>
            )}
            {canPublish && location.status !== "PUBLISHED" && (
              <form action={setLocationStatusAction.bind(null, id, "PUBLISHED")}>
                <ActionButton variant="primary" size="md" pendingLabel="Publishing…">
                  <CheckCircleIcon />
                  Publish
                </ActionButton>
              </form>
            )}
            {canPublish && location.status === "PUBLISHED" && (
              <form action={setLocationStatusAction.bind(null, id, "DRAFT")}>
                <ActionButton variant="secondary" size="md" pendingLabel="Updating…">
                  Unpublish
                </ActionButton>
              </form>
            )}
          </>
        }
      />
      {/* Keyed by save time so the form remounts with fresh values after a status change. */}
      <LocationForm
        key={String(location.updatedAt)}
        action={updateLocationAction.bind(null, id)}
        submitLabel="Save changes"
        defaultValues={defaultValues}
      />
    </div>
  );
}
