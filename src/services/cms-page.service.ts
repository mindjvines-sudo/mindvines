import "server-only";
import { randomBytes } from "node:crypto";
import { isValidObjectId, type Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { editableContent, liveContent, seoFromStored, seoToStored, type StoredPage } from "@/lib/cms/content";
import { SYSTEM_LAYOUTS, componentDefaults } from "@/lib/cms/components";
import { slugProblem, SYSTEM_PAGES, systemPage } from "@/lib/cms/reserved";
import { pageContentSchema, systemContentSchema, systemSeoSchema, type ValidPageContent } from "@/lib/cms/sections.schema";
import { DEFAULT_STYLE, EMPTY_SEO, type AnySection, type PageContent, type SeoContent } from "@/lib/cms/sections";
import "@/models/User"; // registers the model that updatedBy/createdBy populate from
import { Page } from "@/models/Page";

type PageStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED" | "UNPUBLISHED" | "ARCHIVED";
import { PageVersion } from "@/models/PageVersion";
import { Redirect } from "@/models/Redirect";

/** The address a built-in page's record is stored under. It never routes: the page keeps its own address in code. */
export const systemSlug = (key: string) => `__system:${key}`;

export class CmsError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "INVALID" | "SLUG_TAKEN" | "SYSTEM_PAGE" | "BAD_DATE",
    message: string,
    readonly fields?: Record<string, string[]>
  ) {
    super(message);
  }
}

const isDuplicateKey = (error: unknown) => typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
export const newSectionId = () => randomBytes(9).toString("base64url");

/** Validates and sanitises page content; throws the field errors an editor can show. */
export function parseContent(input: unknown, systemKey?: string | null): ValidPageContent {
  const result = systemKey ? systemContentSchema.safeParse(input) : pageContentSchema.safeParse(input);
  if (result.success) return systemKey ? { ...result.data, slug: systemSlug(systemKey) } : result.data;
  const fields: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "form";
    (fields[key] ??= []).push(issue.message);
  }
  throw new CmsError("INVALID", Object.values(fields)[0]?.[0] ?? "Please check the highlighted fields.", fields);
}

async function slugTaken(slug: string, exceptId?: string) {
  return Boolean(await Page.exists({ ...(exceptId && { _id: { $ne: exceptId } }), $or: [{ slug }, { "draft.slug": slug }] }));
}

async function assertSlugFree(slug: string, exceptId?: string) {
  const problem = slugProblem(slug);
  if (problem) throw new CmsError("INVALID", problem, { slug: [problem] });
  if (await slugTaken(slug, exceptId)) throw new CmsError("SLUG_TAKEN", "Another page already uses this address.", { slug: ["Another page already uses this address."] });
}

/** The stored fields a piece of validated content becomes when it goes live. */
function liveFields(content: PageContent) {
  return {
    title: content.title,
    slug: content.slug,
    template: content.template,
    excerpt: content.description,
    featuredImage: content.featuredImage,
    seo: seoToStored(content.seo),
    liveMeta: { sitemap: content.seo.sitemap },
    sections: content.sections,
    // The old single-HTML body is superseded once a page is published from the builder.
    content: "",
  };
}

// ---------------------------------------------------------------- admin reads

export async function listCmsPagesAdmin(params: { status?: string; search?: string; type?: "CMS" | "SYSTEM" } = {}, userId?: string) {
  await connectToDatabase();
  await promoteDueSchedules();
  if (userId) await ensureSystemPages(userId);
  const search = params.search?.trim().slice(0, 80);
  const pattern = search ? { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } : undefined;

  const cms =
    params.type === "SYSTEM"
      ? []
      : await Page.find({ kind: { $ne: "SYSTEM" }, ...(params.status && { status: params.status as PageStatus }), ...(pattern && { $or: [{ title: pattern }, { slug: pattern }] }) })
          .sort({ updatedAt: -1 })
          .limit(300)
          .populate<{ draftUpdatedBy: { name?: string } | null; updatedBy: { name?: string } | null }>("updatedBy", "name")
          .lean();

  const docs = params.type === "CMS" || params.status ? [] : await Page.find({ kind: "SYSTEM" }).populate<{ updatedBy: { name?: string } | null }>("updatedBy", "name").lean();
  const system = SYSTEM_PAGES.filter((page) => !pattern || new RegExp(pattern.$regex, "i").test(`${page.title} ${page.path}`)).map((page) => {
    const doc = docs.find((item) => item.systemKey === page.key);
    return {
      ...page,
      seoEdited: Boolean(doc?.seo?.title || doc?.seo?.description),
      /** The page is drawn from the CMS rather than from its built-in layout. */
      customised: Boolean(doc?.publishedVersion) && doc?.status === "PUBLISHED",
      hasDraft: Boolean(doc?.draft),
      updatedAt: doc?.updatedAt ?? null,
      updatedBy: doc?.updatedBy?.name ?? null,
      id: doc?._id.toString() ?? null,
    };
  });

  return {
    cms: cms.map((page) => ({
      id: page._id.toString(),
      title: editableContent(page as StoredPage).title,
      slug: page.slug,
      status: page.status,
      hasDraft: Boolean(page.draft),
      publishAt: page.publishAt ?? null,
      updatedAt: page.updatedAt,
      updatedBy: page.updatedBy?.name ?? null,
    })),
    system,
  };
}

export async function getPageForEditor(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  await promoteDueSchedules();
  const page = await Page.findById(id).lean();
  if (!page) return null;
  const isSystem = page.kind === "SYSTEM";
  return {
    id: page._id.toString(),
    status: page.status,
    kind: page.kind,
    systemKey: page.systemKey ?? null,
    liveSlug: page.slug,
    hasDraft: Boolean(page.draft),
    isLive: Boolean(page.publishedVersion) && page.status === "PUBLISHED",
    publishedVersion: page.publishedVersion ?? null,
    scheduledVersion: page.scheduledVersion ?? null,
    publishAt: page.publishAt?.toISOString() ?? null,
    updatedAt: page.updatedAt.toISOString(),
    // A built-in page nobody has customised yet opens as its current layout, ready to edit.
    content: isSystem && !hasLayout(page) ? systemSeed(page.systemKey!, page as StoredPage) : editableContent(page as StoredPage),
  };
}

export async function listVersions(id: string) {
  if (!isValidObjectId(id)) return [];
  await connectToDatabase();
  const versions = await PageVersion.find({ page: id }).sort({ versionNumber: -1 }).limit(100).populate<{ createdBy: { name?: string } | null }>("createdBy", "name").lean();
  return versions.map((version) => ({
    versionNumber: version.versionNumber,
    kind: version.kind,
    note: version.note ?? "",
    createdAt: version.createdAt,
    createdBy: version.createdBy?.name ?? null,
    title: (version.snapshot as PageContent).title,
    slug: (version.snapshot as PageContent).slug,
    sectionCount: (version.snapshot as PageContent).sections?.length ?? 0,
  }));
}

// ------------------------------------------------------------------ mutations

export async function createCmsPage(input: { title: string; slug: string; template?: string; description?: string }, userId: string) {
  await connectToDatabase();
  const content = parseContent({ title: input.title, slug: input.slug, template: input.template ?? "DEFAULT", description: input.description ?? "", sections: [] });
  await assertSlugFree(content.slug);
  try {
    const page = await Page.create({
      title: content.title,
      slug: content.slug,
      kind: "CMS",
      status: "DRAFT",
      template: content.template,
      excerpt: content.description,
      draft: content,
      draftUpdatedAt: new Date(),
      draftUpdatedBy: userId,
      createdBy: userId,
      updatedBy: userId,
    });
    return page._id.toString();
  } catch (error) {
    if (isDuplicateKey(error)) throw new CmsError("SLUG_TAKEN", "Another page already uses this address.", { slug: ["Another page already uses this address."] });
    throw error;
  }
}

/** Saves the editor's content as the page's draft. Nothing here reaches the live site. */
export async function saveDraft(id: string, input: unknown, userId: string) {
  if (!isValidObjectId(id)) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  await connectToDatabase();
  const page = await Page.findById(id, "kind systemKey").lean();
  if (!page) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  const system = page.kind === "SYSTEM" ? page.systemKey : undefined;
  const content = parseContent(input, system);
  if (!system) await assertSlugFree(content.slug, id);
  await Page.updateOne({ _id: id }, { $set: { draft: content, draftUpdatedAt: new Date(), draftUpdatedBy: userId, updatedBy: userId } });
  return content;
}

export async function discardDraft(id: string, userId: string) {
  if (!isValidObjectId(id)) return false;
  await connectToDatabase();
  // Only a page that has live content can fall back to it.
  const result = await Page.updateOne({ _id: id, publishedVersion: { $exists: true } }, { $set: { updatedBy: userId }, $unset: { draft: "", draftUpdatedAt: "" } });
  return result.modifiedCount > 0;
}

/** Makes a version the live content, at most once: `scheduledVersion` (for a due schedule) or the page's current state guards it. */
async function goLive(pageId: Types.ObjectId | string, versionNumber: number, content: PageContent, filter: Record<string, unknown>, userId?: string) {
  const before = await Page.findOne({ _id: pageId, ...filter }, "slug status publishedVersion").lean();
  if (!before) return null;
  const wasLiveBefore = Boolean(before.publishedVersion);
  const updated = await Page.findOneAndUpdate(
    { _id: pageId, ...filter },
    {
      $set: { ...liveFields(content), status: "PUBLISHED", publishedAt: new Date(), publishedVersion: versionNumber, ...(userId && { updatedBy: userId }) },
      $unset: { draft: "", draftUpdatedAt: "", scheduledVersion: "", publishAt: "" },
    },
    { returnDocument: "before", projection: "slug" }
  );
  if (!updated) return null;
  // The address changed: the old one keeps working, and the new one is no longer a redirect source.
  if (wasLiveBefore && updated.slug !== content.slug) {
    await Redirect.updateOne({ from: updated.slug }, { $set: { to: content.slug, createdBy: userId } }, { upsert: true });
    // Earlier redirects into the old address now point at the newest one, so nothing chains.
    await Redirect.updateMany({ to: updated.slug }, { $set: { to: content.slug } });
  }
  await Redirect.deleteMany({ from: content.slug });
  return { oldSlug: updated.slug, newSlug: content.slug };
}

/** Publishes the draft now, or schedules it. Re-validates and re-sanitises first, so only clean content ever goes live. */
export async function publishPage(id: string, userId: string, options: { publishAt?: Date } = {}) {
  if (!isValidObjectId(id)) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  await connectToDatabase();
  const page = await Page.findById(id).lean();
  if (!page) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  const system = page.kind === "SYSTEM" ? page.systemKey : undefined;

  const source = system && !hasLayout(page) ? systemSeed(system, page as StoredPage) : editableContent(page as StoredPage);
  const content = parseContent(source, system);
  if (!system) await assertSlugFree(content.slug, id);
  const when = options.publishAt;
  if (when && when.getTime() <= Date.now() + 30_000) throw new CmsError("BAD_DATE", "Choose a time in the future to schedule this page.", { publishAt: ["Choose a time in the future."] });

  const counted = await Page.findOneAndUpdate({ _id: id }, { $inc: { versionCounter: 1 } }, { returnDocument: "after", projection: "versionCounter" });
  const versionNumber = counted!.versionCounter;
  await PageVersion.create({ page: id, versionNumber, snapshot: content, kind: when ? "SCHEDULED" : "PUBLISHED", createdBy: userId });

  if (when) {
    // The draft stays as it is; the live content is untouched until the date. A page that has never been live is SCHEDULED, one already live stays PUBLISHED.
    const live = Boolean(page.publishedVersion) && page.status === "PUBLISHED";
    await Page.updateOne(
      { _id: id },
      { $set: { draft: content, scheduledVersion: versionNumber, publishAt: when, updatedBy: userId, ...(live ? {} : { status: "SCHEDULED" }) } }
    );
    return { versionNumber, scheduled: true, slugs: [page.slug, content.slug] };
  }
  const moved = await goLive(id, versionNumber, content, {}, userId);
  return { versionNumber, scheduled: false, slugs: [moved?.oldSlug, moved?.newSlug, page.slug] };
}

/** Takes a page off the site (its content is kept and can be published again), or cancels a schedule on a page that was never live. */
export async function unpublishPage(id: string, userId: string) {
  if (!isValidObjectId(id)) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  await connectToDatabase();
  const page = await Page.findById(id, "kind publishedVersion status slug").lean();
  if (!page) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  await Page.updateOne(
    { _id: id },
    { $set: { status: page.publishedVersion ? "UNPUBLISHED" : "DRAFT", updatedBy: userId }, $unset: { scheduledVersion: "", publishAt: "" } }
  );
  return [page.slug];
}

/** Copies a version into the draft. The live page is untouched until the draft is published. */
export async function restoreVersion(id: string, versionNumber: number, userId: string) {
  if (!isValidObjectId(id)) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  await connectToDatabase();
  const version = await PageVersion.findOne({ page: id, versionNumber }).lean();
  if (!version) throw new CmsError("NOT_FOUND", "That version no longer exists.");
  // Old content is cleaned again on the way back in: rules may have tightened since it was saved.
  const target = await Page.findById(id, "kind systemKey").lean();
  if (!target) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  const content = parseContent(version.snapshot, target.kind === "SYSTEM" ? target.systemKey : undefined);
  await Page.updateOne({ _id: id }, { $set: { draft: content, draftUpdatedAt: new Date(), draftUpdatedBy: userId, updatedBy: userId } });
  return content;
}

export async function duplicatePage(id: string, userId: string) {
  if (!isValidObjectId(id)) throw new CmsError("NOT_FOUND", "This page no longer exists.");
  await connectToDatabase();
  const page = await Page.findById(id).lean();
  if (!page || page.kind === "SYSTEM") throw new CmsError("NOT_FOUND", "This page no longer exists.");
  const source = editableContent(page as StoredPage);
  let slug = `${source.slug}-copy`.slice(0, 80);
  for (let n = 2; await slugTaken(slug); n += 1) slug = `${source.slug}-copy-${n}`.slice(0, 80);
  const copy = parseContent({ ...source, title: `Copy of ${source.title}`.slice(0, 160), slug, sections: source.sections.map((section) => ({ ...section, id: newSectionId() })) });
  const created = await Page.create({
    title: copy.title, slug: copy.slug, kind: "CMS", status: "DRAFT", template: copy.template, excerpt: copy.description,
    draft: copy, draftUpdatedAt: new Date(), draftUpdatedBy: userId, createdBy: userId, updatedBy: userId,
  });
  return created._id.toString();
}

export async function deleteCmsPage(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  const page = await Page.findOneAndDelete({ _id: id, kind: { $ne: "SYSTEM" } }, { projection: "slug" });
  if (!page) return null;
  await Promise.all([PageVersion.deleteMany({ page: id }), Redirect.deleteMany({ $or: [{ to: page.slug }, { from: page.slug }] })]);
  return page.slug;
}

// ----------------------------------------------------------------- scheduling

/** Puts due scheduled versions live. Called wherever pages are read, so scheduling needs no cron job; each version goes live once. */
export async function promoteDueSchedules(now = new Date()) {
  const due = await Page.find({ scheduledVersion: { $exists: true }, publishAt: { $lte: now } }, "scheduledVersion kind systemKey").limit(50).lean();
  const slugs: string[] = [];
  for (const page of due) {
    const version = await PageVersion.findOne({ page: page._id, versionNumber: page.scheduledVersion }).lean();
    if (!version) {
      await Page.updateOne({ _id: page._id, scheduledVersion: page.scheduledVersion }, { $unset: { scheduledVersion: "", publishAt: "" } });
      continue;
    }
    try {
      const moved = await goLive(page._id, version.versionNumber, parseContent(version.snapshot, page.kind === "SYSTEM" ? page.systemKey : undefined), { scheduledVersion: version.versionNumber });
      if (moved) slugs.push(moved.oldSlug, moved.newSlug);
    } catch {
      // Content that no longer validates stays scheduled for an admin to look at, rather than going live unchecked.
    }
  }
  return slugs;
}

// --------------------------------------------------------------- public reads

export type PublicPage = {
  id: string;
  title: string;
  slug: string;
  template: PageContent["template"];
  description: string;
  featuredImage: string;
  seo: SeoContent;
  sections: PageContent["sections"];
  updatedAt: string;
};

/** The live page at an address, or null. Drafts, unpublished and not-yet-due scheduled pages are never returned. */
export async function readPublishedPage(slug: string): Promise<PublicPage | null> {
  if (slugProblem(slug) && !/^[a-z0-9-]+$/.test(slug)) return null;
  await connectToDatabase();
  await promoteDueSchedules();
  const page = await Page.findOne({ slug, kind: { $ne: "SYSTEM" }, status: "PUBLISHED" }).lean();
  if (!page) return null;
  const content = liveContent(page as StoredPage);
  // Pages saved before the builder hold unsanitised HTML; it is cleaned now, on the server, before it can be shown.
  const { sanitizeRichHtml } = await import("@/lib/cms/sanitize");
  const sections = content.sections.map((section) => (section.id === "legacy-content" && section.type === "richText" ? { ...section, data: { ...section.data, html: sanitizeRichHtml(section.data.html) } } : section));
  return {
    id: page._id.toString(),
    title: content.title,
    slug: page.slug,
    template: content.template,
    description: content.description,
    featuredImage: content.featuredImage,
    seo: content.seo,
    sections: sections.filter((section) => section.visible !== false),
    updatedAt: page.updatedAt.toISOString(),
  };
}

export async function findRedirect(slug: string) {
  await connectToDatabase();
  const redirect = await Redirect.findOne({ from: slug }, "to").lean();
  if (!redirect) return null;
  // Only ever to a page that is live now; otherwise the old link is simply gone.
  const live = await Page.exists({ slug: redirect.to, kind: { $ne: "SYSTEM" }, status: "PUBLISHED" });
  return live ? redirect.to : null;
}

export async function listSitemapPages() {
  await connectToDatabase();
  await promoteDueSchedules();
  const pages = await Page.find({ kind: { $ne: "SYSTEM" }, status: "PUBLISHED", "liveMeta.sitemap": { $ne: false }, "seo.robots": { $not: /noindex/i } }, "slug updatedAt").lean();
  return pages.map((page) => ({ slug: page.slug, updatedAt: page.updatedAt }));
}

// --------------------------------------------------------------- system pages

export async function getSystemSeo(key: string): Promise<SeoContent | null> {
  if (!systemPage(key)) return null;
  await connectToDatabase();
  const doc = await Page.findOne({ systemKey: key }, "seo liveMeta").lean();
  return doc ? liveContent({ title: "", slug: "", seo: doc.seo, liveMeta: doc.liveMeta }).seo : null;
}

export async function saveSystemSeo(key: string, input: unknown, userId: string) {
  const meta = systemPage(key);
  if (!meta) throw new CmsError("NOT_FOUND", "This page doesn't exist.");
  const parsed = systemSeoSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) (fields[issue.path.join(".")] ??= []).push(issue.message);
    throw new CmsError("INVALID", "Please check the highlighted fields.", fields);
  }
  await connectToDatabase();
  const seo = parsed.data.seo;
  await Page.updateOne(
    { systemKey: key },
    {
      $set: { seo: seoToStored(seo), liveMeta: { sitemap: seo.sitemap }, updatedBy: userId },
      $setOnInsert: { title: meta.title, slug: `__system:${key}`, kind: "SYSTEM", systemKey: key, status: "PUBLISHED", content: "", createdBy: userId },
    },
    { upsert: true }
  );
  // A draft in progress carries its own copy of the SEO; keep it in step so publishing it can't undo this save.
  await Page.updateOne({ systemKey: key, draft: { $ne: null } }, { $set: { "draft.seo": seo } });
  return meta.path;
}

// ------------------------------------------------- built-in (system) pages

/** A built-in page's records customise it only once a layout has been published or drafted. */
const hasLayout = (page: { draft?: unknown; publishedVersion?: number | null; sections?: unknown[] | null }) =>
  Boolean(page.draft) || Boolean(page.publishedVersion && (page.sections ?? []).length > 0);

/** The page exactly as the code lays it out today, as sections an admin can edit. */
export function systemSeed(key: string, stored?: StoredPage): PageContent {
  const meta = systemPage(key);
  const sections = (SYSTEM_LAYOUTS[key as keyof typeof SYSTEM_LAYOUTS] ?? []).map(
    (component) => ({ id: newSectionId(), type: "component", visible: true, style: DEFAULT_STYLE, data: { component, props: componentDefaults(component, key) } }) as AnySection
  );
  return {
    title: meta?.title ?? key,
    slug: systemSlug(key),
    template: "DEFAULT",
    description: "",
    featuredImage: "",
    seo: stored ? seoFromStored(stored) : EMPTY_SEO,
    sections,
  };
}

/** Makes sure each built-in page has a record to hang its drafts, versions and SEO on. */
export async function ensureSystemPages(userId: string) {
  await connectToDatabase();
  const existing = new Set((await Page.find({ kind: "SYSTEM" }, "systemKey").lean()).map((doc) => doc.systemKey));
  for (const meta of SYSTEM_PAGES.filter((page) => !existing.has(page.key))) {
    await Page.updateOne(
      { systemKey: meta.key },
      { $setOnInsert: { title: meta.title, slug: systemSlug(meta.key), kind: "SYSTEM", systemKey: meta.key, status: "PUBLISHED", content: "", createdBy: userId } },
      { upsert: true }
    );
  }
}

export async function getSystemPageId(key: string, userId: string) {
  if (!systemPage(key)) return null;
  await ensureSystemPages(userId);
  const doc = await Page.findOne({ systemKey: key }, "_id").lean();
  return doc?._id.toString() ?? null;
}

export type SystemLayout = { sections: PageContent["sections"]; template: PageContent["template"] };

/** The published layout for a built-in page, or null to use the one in code. A failure here must never take the page down. */
export async function readSystemLayout(key: string): Promise<SystemLayout | null> {
  if (!systemPage(key)) return null;
  await connectToDatabase();
  await promoteDueSchedules();
  const doc = await Page.findOne({ systemKey: key, status: "PUBLISHED", publishedVersion: { $exists: true } }).lean();
  if (!doc || (doc.sections ?? []).length === 0) return null;
  const content = liveContent(doc as StoredPage);
  return { sections: content.sections.filter((section) => section.visible !== false), template: content.template };
}

/** Which built-in page a record is, if any (its public address is fixed, so cache invalidation needs it). */
export async function systemKeyOf(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  const doc = await Page.findById(id, "systemKey kind").lean();
  return doc?.kind === "SYSTEM" ? (doc.systemKey ?? null) : null;
}
