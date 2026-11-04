"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import * as enquiryService from "@/services/enquiry.service";
import { logAction } from "@/services/audit.service";
import type { EnquiryStatus } from "@/lib/constants";

export async function setEnquiryStatusAction(id: string, status: EnquiryStatus) {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "enquiries")) {
    throw new Error("You do not have permission to update enquiries.");
  }

  await enquiryService.setEnquiryStatus(id, status);
  await logAction({
    userId: user.id,
    action: "UPDATE",
    entity: "ContactEnquiry",
    entityId: id,
    metadata: { status },
  });
  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${id}`);
}

export async function deleteEnquiryAction(id: string) {
  const user = await getCurrentUser();
  if (!can(user.role, "delete", "enquiries")) {
    throw new Error("You do not have permission to delete enquiries.");
  }

  await enquiryService.deleteEnquiry(id);
  await logAction({ userId: user.id, action: "DELETE", entity: "ContactEnquiry", entityId: id });
  revalidatePath("/admin/enquiries");
  redirect("/admin/enquiries");
}
