"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can, type Action } from "@/lib/permissions";
import { revalidateCms, revalidateSystemPage } from "@/lib/cms/revalidate";
import { systemPage } from "@/lib/cms/reserved";
import {
  CmsError,
  createCmsPage,
  deleteCmsPage,
  discardDraft,
  duplicatePage,
  publishPage,
  restoreVersion,
  saveDraft,
  saveSystemSeo,
  systemKeyOf,
  unpublishPage,
} from "@/services/cms-page.service";
import { logAction } from "@/services/audit.service";

/** What a builder action returns: never throws for expected problems, so the editor can show them. */
export type CmsResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; message: string; fields?: Record<string, string[]> };

async function authorise(action: Action) {
  const user = await getCurrentUser();
  if (!can(user.role, action, "pages")) return { user: null, denied: { ok: false as const, message: "You don't have permission to do that." } };
  return { user, denied: null };
}

/** A built-in page lives at a fixed address: refresh that address and its cached layout. */
async function refreshSystem(id: string) {
  const key = await systemKeyOf(id);
  const meta = key ? systemPage(key) : undefined;
  if (key && meta) revalidateSystemPage(meta.path, key);
}

function failure(error: unknown) {
  if (error instanceof CmsError) return { ok: false as const, message: error.message, fields: error.fields };
  console.error("[cms]", error);
  return { ok: false as const, message: "Something went wrong. Please try again." };
}

export async function createPageAction(input: { title: string; slug: string; template?: string; description?: string }): Promise<CmsResult<{ id: string }>> {
  const { user, denied } = await authorise("create");
  if (denied) return denied;
  try {
    const id = await createCmsPage(input, user.id);
    await logAction({ userId: user.id, action: "CREATE", entity: "Page", entityId: id });
    return { ok: true, id };
  } catch (error) {
    return failure(error);
  }
}

export async function saveDraftAction(id: string, content: unknown): Promise<CmsResult<{ savedAt: string }>> {
  const { user, denied } = await authorise("update");
  if (denied) return denied;
  try {
    await saveDraft(id, content, user.id);
    await logAction({ userId: user.id, action: "UPDATE", entity: "Page", entityId: id });
    return { ok: true, savedAt: new Date().toISOString() };
  } catch (error) {
    return failure(error);
  }
}

/** Saves the editor's content and then publishes it (now, or at `publishAt`), so the live page is exactly what the editor shows. */
export async function publishPageAction(id: string, content: unknown, publishAt?: string): Promise<CmsResult<{ scheduled: boolean }>> {
  const { user, denied } = await authorise("publish");
  if (denied) return denied;
  try {
    let when: Date | undefined;
    if (publishAt) {
      when = new Date(publishAt);
      if (Number.isNaN(when.getTime())) return { ok: false, message: "Choose a valid date and time.", fields: { publishAt: ["Choose a valid date and time."] } };
    }
    await saveDraft(id, content, user.id);
    const result = await publishPage(id, user.id, { publishAt: when });
    await logAction({ userId: user.id, action: "PUBLISH", entity: "Page", entityId: id, metadata: { version: result.versionNumber, scheduled: result.scheduled } });
    revalidateCms(result.slugs.filter((slug): slug is string => Boolean(slug)));
    await refreshSystem(id);
    return { ok: true, scheduled: result.scheduled };
  } catch (error) {
    return failure(error);
  }
}

export async function unpublishPageAction(id: string): Promise<CmsResult> {
  const { user, denied } = await authorise("publish");
  if (denied) return denied;
  try {
    const slugs = await unpublishPage(id, user.id);
    await logAction({ userId: user.id, action: "UNPUBLISH", entity: "Page", entityId: id });
    revalidateCms(slugs);
    await refreshSystem(id);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function discardDraftAction(id: string): Promise<CmsResult> {
  const { user, denied } = await authorise("update");
  if (denied) return denied;
  const done = await discardDraft(id, user.id);
  if (!done) return { ok: false, message: "This page has no published version to go back to." };
  await logAction({ userId: user.id, action: "UPDATE", entity: "Page", entityId: id, metadata: { discardedDraft: true } });
  return { ok: true };
}

export async function restoreVersionAction(id: string, versionNumber: number): Promise<CmsResult> {
  const { user, denied } = await authorise("update");
  if (denied) return denied;
  try {
    await restoreVersion(id, Number(versionNumber), user.id);
    await logAction({ userId: user.id, action: "UPDATE", entity: "Page", entityId: id, metadata: { restoredVersion: versionNumber } });
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function duplicatePageAction(id: string): Promise<void> {
  const { user, denied } = await authorise("create");
  if (denied) throw new Error(denied.message);
  const copy = await duplicatePage(id, user.id);
  await logAction({ userId: user.id, action: "CREATE", entity: "Page", entityId: copy, metadata: { duplicatedFrom: id } });
  redirect(`/admin/pages/${copy}/edit`);
}

export async function deletePageAction(id: string): Promise<void> {
  const { user, denied } = await authorise("delete");
  if (denied) throw new Error(denied.message);
  const slug = await deleteCmsPage(id);
  if (slug) {
    await logAction({ userId: user.id, action: "DELETE", entity: "Page", entityId: id });
    revalidateCms([slug]);
  }
  redirect("/admin/pages");
}

/** SEO for a code-built page (home, plans, legal…). Only the SEO fields change; the page's layout never does. */
export async function saveSystemSeoAction(key: string, seo: unknown): Promise<CmsResult> {
  const { user, denied } = await authorise("update");
  if (denied) return denied;
  try {
    const path = await saveSystemSeo(key, { seo }, user.id);
    await logAction({ userId: user.id, action: "UPDATE", entity: "SystemPage", entityId: key });
    revalidateSystemPage(path, key);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
