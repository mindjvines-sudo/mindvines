"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { testimonialInputSchema, type TestimonialInput } from "@/validations/testimonial.schema";
import * as testimonialService from "@/services/testimonial.service";
import { logAction } from "@/services/audit.service";
import type { ContentStatus } from "@/lib/constants";

export type TestimonialFormState = {
  errors?: Partial<Record<keyof TestimonialInput, string[]>>;
  message?: string;
} | undefined;

function buildInputFromFormData(formData: FormData) {
  return {
    authorName: formData.get("authorName"),
    authorRole: formData.get("authorRole") || undefined,
    company: formData.get("company") || undefined,
    quote: formData.get("quote"),
    image: formData.get("image") || undefined,
    rating: formData.get("rating") || undefined,
    status: formData.get("status"),
  };
}

// Pages that render the public testimonials section.
function revalidateHome() {
  revalidatePath("/");
  revalidatePath("/about");
}

export async function createTestimonialAction(
  _prev: TestimonialFormState,
  formData: FormData
): Promise<TestimonialFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "testimonials")) {
    return { message: "You do not have permission to create testimonials." };
  }

  const validated = testimonialInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "testimonials")) {
    return { message: "You do not have permission to activate testimonials directly." };
  }

  const testimonial = await testimonialService.createTestimonial(validated.data);
  await logAction({
    userId: user.id,
    action: "CREATE",
    entity: "Testimonial",
    entityId: testimonial._id.toString(),
  });
  revalidateHome();
  redirect("/admin/testimonials");
}

export async function updateTestimonialAction(
  id: string,
  _prev: TestimonialFormState,
  formData: FormData
): Promise<TestimonialFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "testimonials")) {
    return { message: "You do not have permission to edit testimonials." };
  }

  const validated = testimonialInputSchema.safeParse(buildInputFromFormData(formData));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  if (validated.data.status === "PUBLISHED" && !can(user.role, "publish", "testimonials")) {
    return { message: "You do not have permission to activate testimonials directly." };
  }

  const updated = await testimonialService.updateTestimonial(id, validated.data);
  if (!updated) {
    return { message: "Testimonial not found." };
  }

  await logAction({ userId: user.id, action: "UPDATE", entity: "Testimonial", entityId: id });
  revalidateHome();
  redirect("/admin/testimonials");
}

export async function setTestimonialStatusAction(id: string, status: ContentStatus) {
  const user = await getCurrentUser();
  const action = status === "PUBLISHED" ? "publish" : "update";
  if (!can(user.role, action, "testimonials")) {
    throw new Error("You do not have permission to change this testimonial's status.");
  }

  await testimonialService.setTestimonialStatus(id, status);
  await logAction({
    userId: user.id,
    action: status === "PUBLISHED" ? "PUBLISH" : "UNPUBLISH",
    entity: "Testimonial",
    entityId: id,
  });
  revalidateHome();
  revalidatePath("/admin/testimonials");
}

export async function deleteTestimonialAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "testimonials")) {
    throw new Error("You do not have permission to delete testimonials.");
  }

  await testimonialService.deleteTestimonial(id);
  await logAction({ userId: user.id, action: "DELETE", entity: "Testimonial", entityId: id });
  revalidateHome();
  redirect("/admin/testimonials");
}

export async function reorderTestimonialAction(id: string, direction: "up" | "down") {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "testimonials")) {
    throw new Error("You do not have permission to reorder testimonials.");
  }

  await testimonialService.reorderTestimonial(id, direction);
  revalidateHome();
  revalidatePath("/admin/testimonials");
}
