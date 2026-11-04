import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { getServiceByIdAdmin } from "@/services/service.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { asPopulatedMedia } from "@/types/media";
import { ServiceForm, type ServiceFormDefaults } from "../../service-form";
import { setServiceStatusAction, updateServiceAction } from "../../actions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { ButtonLink } from "@/components/admin/ui/button";
import { ActionButton } from "@/components/admin/ui/confirm-action";
import { ArchiveIcon, CheckCircleIcon, ExternalLinkIcon, EyeIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Edit Service" };

/** Populated Media documents are serialised so they can cross into the client form. */
function plainMedia(value: unknown) {
  return asPopulatedMedia(value) ? JSON.parse(JSON.stringify(value)) : null;
}

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const [user, service] = await Promise.all([getCurrentUser(), getServiceByIdAdmin(id)]);

  if (!service) {
    notFound();
  }

  const canPublish = can(user.role, "publish", "services");

  const defaultValues: ServiceFormDefaults = {
    name: service.name,
    slug: service.slug,
    tagline: service.tagline ?? undefined,
    shortDescription: service.shortDescription,
    description: service.description,
    icon: service.icon ?? undefined,
    image: plainMedia(service.image),
    bannerImage: plainMedia(service.bannerImage),
    features: service.features,
    process: service.process.map((step) => ({ title: step.title ?? "", description: step.description ?? "" })),
    faqs: service.faqs.map((faq) => ({ question: faq.question ?? "", answer: faq.answer ?? "" })),
    status: service.status,
    seo: service.seo
      ? {
          title: service.seo.title ?? undefined,
          description: service.seo.description ?? undefined,
          canonical: service.seo.canonical ?? undefined,
          keywords: service.seo.keywords ?? undefined,
          ogImage: service.seo.ogImage ?? undefined,
        }
      : undefined,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/services", label: "All services" }}
        title="Edit service"
        meta={<StatusBadge status={service.status} />}
        description={service.name}
        actions={
          <>
            {service.status === "PUBLISHED" ? (
              <ButtonLink href={`/services/${service.slug}`} target="_blank" rel="noopener" variant="secondary">
                <ExternalLinkIcon />
                View on site
              </ButtonLink>
            ) : (
              <ButtonLink href={`/admin/services/${id}/preview`} variant="secondary">
                <EyeIcon />
                Preview
              </ButtonLink>
            )}
            {canPublish && service.status !== "PUBLISHED" && (
              <form action={setServiceStatusAction.bind(null, id, "PUBLISHED")}>
                <ActionButton variant="primary" size="md" pendingLabel="Publishing…">
                  <CheckCircleIcon />
                  Publish
                </ActionButton>
              </form>
            )}
            {canPublish && service.status === "PUBLISHED" && (
              <form action={setServiceStatusAction.bind(null, id, "DRAFT")}>
                <ActionButton variant="secondary" size="md" pendingLabel="Updating…">
                  Unpublish
                </ActionButton>
              </form>
            )}
            {canPublish && service.status !== "ARCHIVED" && (
              <form action={setServiceStatusAction.bind(null, id, "ARCHIVED")}>
                <ActionButton variant="secondary" size="md" pendingLabel="Archiving…">
                  <ArchiveIcon />
                  Archive
                </ActionButton>
              </form>
            )}
          </>
        }
      />

      {/* Keyed by save time so the form remounts with fresh values after a status change. */}
      <ServiceForm
        key={String(service.updatedAt)}
        action={updateServiceAction.bind(null, id)}
        submitLabel="Save changes"
        defaultValues={defaultValues}
      />
    </div>
  );
}
