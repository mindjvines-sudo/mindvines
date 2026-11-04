import type { Metadata } from "next";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getServiceByIdAdmin } from "@/services/service.service";
import { asPopulatedMedia } from "@/types/media";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";
import { ButtonLink } from "@/components/admin/ui/button";
import { Card } from "@/components/admin/ui/card";
import { PencilIcon } from "@/components/admin/icons";

export const metadata: Metadata = {
  title: "Preview Service",
  robots: { index: false, follow: false },
};

export default async function ServicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "services")) notFound();

  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const service = await getServiceByIdAdmin(id);
  if (!service) notFound();
  const image = asPopulatedMedia(service.image);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/services", label: "All services" }}
        title="Preview"
        meta={<StatusBadge status={service.status} />}
        description="This shows the saved version of the service."
        actions={
          can(user.role, "update", "services") && (
            <ButtonLink href={`/admin/services/${id}/edit`}>
              <PencilIcon />
              Edit service
            </ButtonLink>
          )
        }
      />
      <Card as="article" className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-8 p-6 sm:p-10">
          <header className="flex flex-col gap-3">
            <p className="text-[13px] text-slate-500">/services/{service.slug}</p>
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-navy-900 sm:text-4xl">{service.name}</h1>
            {service.tagline && <p className="text-lg font-medium text-primary-700">{service.tagline}</p>}
            <p className="text-lg leading-8 text-slate-600">{service.shortDescription}</p>
          </header>
          {image && (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview
            <img src={image.secureUrl} alt={image.altText ?? service.name} className="w-full rounded-xl object-cover" />
          )}
          {/* Matches the public rendering of HTML authored by signed-in editors. */}
          <div
            className="prose prose-slate max-w-none break-words prose-headings:text-navy-900 prose-a:text-primary-700"
            dangerouslySetInnerHTML={{ __html: service.description }}
          />
          {service.features.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-navy-900">Key benefits</h2>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                {service.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </section>
          )}
          {service.process.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-navy-900">Treatment process</h2>
              <ol className="list-decimal space-y-2 pl-5 text-slate-700">
                {service.process.map((step, index) => (
                  <li key={index}>
                    <span className="font-medium text-navy-900">{step.title}</span>
                    {step.description && <span> — {step.description}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
          {service.faqs.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-navy-900">FAQs</h2>
              <dl className="space-y-3">
                {service.faqs.map((faq, index) => (
                  <div key={index}>
                    <dt className="font-medium text-navy-900">{faq.question}</dt>
                    <dd className="text-slate-600">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </Card>
    </div>
  );
}
