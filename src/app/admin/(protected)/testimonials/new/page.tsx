import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/page-header";
import { TestimonialForm } from "../testimonial-form";
import { createTestimonialAction } from "../actions";

export const metadata: Metadata = { title: "Add Testimonial" };

export default function NewTestimonialPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/admin/testimonials", label: "All testimonials" }}
        title="Add testimonial"
        description="Share a patient’s experience on the website."
      />
      <TestimonialForm action={createTestimonialAction} submitLabel="Create testimonial" />
    </div>
  );
}
