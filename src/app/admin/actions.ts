"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/session";
import { logAction } from "@/services/audit.service";
import { verifySession } from "@/lib/dal";

export async function logout() {
  const session = await verifySession();
  await deleteSession();
  await logAction({ userId: session.userId, action: "LOGOUT", entity: "User", entityId: session.userId });
  redirect("/admin/login");
}
