import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTestimonialByIdAdmin } from "@/services/testimonial.service";
import { TestimonialForm, type TestimonialFormDefaults } from "../../testimonial-form";
import { updateTestimonialAction } from "../../actions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/badge";

export const metadata: Metadata = { title: "Edit Testimonial" };

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const testimonial = await getTestimonialByIdAdmin(id);

  if (!testimonial) {
    notFound();
  }

  const image =
    testimonial.image && typeof testimonial.image === "object" && "secureUrl" in testimonial.image
      ? JSON.parse(JSON.stringify(testimonial.image))
      : null;

  const defaultValues: TestimonialFormDefaults = {
    authorName: testimonial.authorName,
    authorRole: testimonial.authorRole ?? undefined,
    company: testimonial.company ?? undefined,
    quote: testimonial.quote,
    image,
    rating: testimonial.rating ?? undefined,
    status: testimonial.status,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/testimonials", label: "All testimonials" }}
        title="Edit testimonial"
        meta={<StatusBadge status={testimonial.status} kind="testimonial" />}
        description={testimonial.authorName}
      />
      <TestimonialForm
        action={updateTestimonialAction.bind(null, id)}
        submitLabel="Save changes"
        defaultValues={defaultValues}
      />
    </div>
  );
}
