import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { Types } from "mongoose";
import { EMBED_HOSTS, safeImage, safeLink, sanitizeRichHtml, videoSource } from "../src/lib/cms/sanitize";
import { slugProblem } from "../src/lib/cms/reserved";
import { pageContentSchema } from "../src/lib/cms/sections.schema";
import { newSection, EMPTY_SEO, DEFAULT_STYLE } from "../src/lib/cms/sections";
import { COMPONENTS, SYSTEM_LAYOUTS, componentDefaults } from "../src/lib/cms/components";
import { conform } from "../src/lib/cms/conform";
import { sanitizeHtmlBlock } from "../src/lib/cms/sanitize";
import { systemContentSchema } from "../src/lib/cms/sections.schema";

/* ---------------------------------------------------------------- sanitiser */

test("scripts, event handlers and javascript: links never survive", () => {
  const dirty = [
    `<p onclick="steal()">Hi</p><script>alert(1)</script>`,
    `<img src="https://res.cloudinary.com/x/a.jpg" onerror="alert(1)">`,
    `<a href="javascript:alert(1)">x</a>`,
    `<a href="  JaVaScRiPt:alert(1)">x</a>`,
    `<img src="javascript:alert(1)">`,
    `<style>body{display:none}</style><p style="position:fixed;top:0">x</p>`,
    `<svg onload="alert(1)"><circle/></svg>`,
    `<object data="x"></object><embed src="x"><form action="/x"><input></form>`,
  ].join("");
  const clean = sanitizeRichHtml(dirty);
  for (const bad of ["<script", "onclick", "onerror", "onload", "javascript:", "<style", "position", "<svg", "<object", "<embed", "<form", "<input"]) {
    assert.ok(!clean.toLowerCase().includes(bad), `${bad} survived: ${clean}`);
  }
  assert.ok(clean.includes("Hi"));
});

test("only approved video hosts may be embedded", () => {
  assert.deepEqual(EMBED_HOSTS.sort(), ["player.vimeo.com", "www.youtube-nocookie.com", "www.youtube.com"]);
  assert.ok(sanitizeRichHtml(`<iframe src="https://www.youtube.com/embed/abc"></iframe>`).includes("youtube.com/embed/abc"));
  assert.ok(sanitizeRichHtml(`<iframe src="https://player.vimeo.com/video/1"></iframe>`).includes("player.vimeo.com"));
  for (const evil of [`https://evil.example/x`, `http://www.youtube.com/embed/a`, `javascript:alert(1)`, `//evil.example/x`, `https://www.youtube.com.evil.example/embed/a`]) {
    assert.ok(!sanitizeRichHtml(`<iframe src="${evil}"></iframe>`).includes("<iframe"), evil);
  }
  assert.ok(!sanitizeRichHtml(`<iframe srcdoc="<script>alert(1)</script>"></iframe>`).includes("<iframe"));
});

test("links and images are limited to safe destinations", () => {
  for (const ok of ["/subscriptions", "#top", "mailto:a@b.co", "tel:+911234567890", "https://example.com/x"]) assert.equal(safeLink(ok), ok);
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "https://user:pw@example.com", "vbscript:x", "/\\evil"]) assert.equal(safeLink(bad), null, bad);
  assert.equal(safeImage("https://res.cloudinary.com/demo/image/upload/a.jpg"), "https://res.cloudinary.com/demo/image/upload/a.jpg");
  assert.equal(safeImage("/images/a.png"), "/images/a.png");
  for (const bad of ["https://evil.example/a.jpg", "javascript:x", "data:image/svg+xml;base64,AAAA"]) assert.equal(safeImage(bad), null, bad);
});

test("video links resolve to approved embeds only", () => {
  assert.equal(videoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.src, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoSource("https://youtu.be/dQw4w9WgXcQ")?.kind, "iframe");
  assert.equal(videoSource("https://vimeo.com/123456")?.src, "https://player.vimeo.com/video/123456");
  assert.equal(videoSource("https://evil.example/video.mp4"), null);
  assert.equal(videoSource("javascript:alert(1)"), null);
});

/* ------------------------------------------------------------------ schema */

const page = (over: Record<string, unknown> = {}) => ({ title: "About us", slug: "about-us", template: "DEFAULT", description: "", featuredImage: "", seo: EMPTY_SEO, sections: [], ...over });

test("reserved and malformed addresses are refused", () => {
  for (const slug of ["admin", "api", "checkout", "subscriptions", "pilot", "renew", "preview", "sitemap.xml", "Has Caps", "a--b", "-a", ""]) assert.ok(slugProblem(slug), slug);
  assert.equal(slugProblem("our-story"), null);
});

test("saving cleans every text field and rejects bad links", () => {
  const rich = newSection("richText", "rich-1");
  rich.data.html = `<p>ok</p><script>alert(1)</script>`;
  const hero = newSection("hero", "hero-1");
  hero.data.heading = `<b onmouseover="x">Welcome</b>`;
  hero.data.buttons = [{ text: "Go", url: "/subscriptions" }];
  const result = pageContentSchema.safeParse(page({ sections: [hero, rich] }));
  assert.ok(result.success, JSON.stringify(result.error?.issues));
  const out = JSON.stringify(result.data);
  assert.ok(!out.includes("<script") && !out.includes("onmouseover") && !out.includes("<b"));

  const evil = newSection("cta", "cta-1");
  evil.data.buttons = [{ text: "Click", url: "javascript:alert(1)" }];
  assert.equal(pageContentSchema.safeParse(page({ sections: [evil] })).success, false);
  assert.equal(pageContentSchema.safeParse(page({ slug: "admin" })).success, false);
  assert.equal(pageContentSchema.safeParse(page({ title: "" })).success, false);
  assert.equal(pageContentSchema.safeParse(page({ sections: [newSection("spacer", "same-id"), newSection("spacer", "same-id")] })).success, false);
  assert.equal(pageContentSchema.safeParse(page({ sections: [{ id: "abcd", type: "script", visible: true, style: {}, data: {} }] })).success, false);
});

/* ------------------------------------------------- built-in component content */

const issues = () => [] as { path: string; message: string }[];

test("component content is held to the shape the component was built for", () => {
  const found = issues();
  const hero = componentDefaults("hero");
  const out = conform(hero, { badge: "<b onclick='x'>New badge</b>", heading: 42, extra: "<script>x</script>", cta: { label: "Go", href: "/pilot", sneaky: 1 }, image: { src: "/images/x.png", width: "100", alt: "A" } }, "props", found) as Record<string, unknown>;
  assert.equal(found.length, 0);
  assert.equal(out.badge, "New badge");
  assert.equal(out.heading, (hero as { heading: string }).heading, "wrong type keeps the built-in text");
  assert.ok(!("extra" in out));
  assert.deepEqual(Object.keys(out.cta as object).sort(), ["href", "label"]);
  assert.equal((out.image as { width: number }).width, (hero as { image: { width: number } }).image.width);
});

test("component links and pictures must be safe", () => {
  const found = issues();
  conform(componentDefaults("hero"), { cta: { label: "x", href: "javascript:alert(1)" }, image: { src: "https://evil.example/a.png" } }, "props", found);
  assert.deepEqual(found.map((item) => item.path).sort(), ["props.cta.href", "props.image.src"]);
});

test("lists take their item shape from the built-in first item and are capped", () => {
  const faq = componentDefaults("faq");
  const many = Array.from({ length: 300 }, (_, i) => ({ question: `Q${i}`, answer: "A", junk: "<img src=x onerror=1>" }));
  const out = conform(faq, { heading: "H", items: many }, "props", issues()) as { items: Record<string, unknown>[] };
  assert.equal(out.items.length, 100);
  assert.deepEqual(Object.keys(out.items[0]).sort(), ["answer", "question"]);
});

test("every built-in page's layout is made of components that exist and are allowed on it", () => {
  for (const [page, keys] of Object.entries(SYSTEM_LAYOUTS)) {
    for (const key of keys) {
      const where = COMPONENTS[key].pages;
      assert.ok(where === "any" || (where as string[]).includes(page), `${key} on ${page}`);
      assert.ok(componentDefaults(key, page));
    }
  }
  assert.ok((componentDefaults("legalDocument", "terms") as { body: string }).body.includes("Mindvines"));
});

test("a component section validates through the page schema, and bad links are refused", () => {
  const good = { id: "comp-1", type: "component", visible: true, style: DEFAULT_STYLE, data: { component: "hero", props: componentDefaults("hero") } };
  assert.ok(systemContentSchema.safeParse(page({ slug: "x", sections: [good] })).success);
  const bad = { ...good, id: "comp-2", data: { component: "hero", props: { ...componentDefaults("hero"), cta: { label: "x", href: "javascript:alert(1)" } } } };
  assert.equal(systemContentSchema.safeParse(page({ sections: [bad] })).success, false);
  assert.equal(systemContentSchema.safeParse(page({ sections: [{ ...good, id: "comp-3", data: { component: "notReal", props: {} } }] })).success, false);
});

test("advanced HTML keeps safe presentation styles and drops everything dangerous", () => {
  const clean = sanitizeHtmlBlock(`<div style="color:#b58c61;padding:16px;border-radius:12px;position:fixed;top:0;background:url(javascript:alert(1));width:expression(alert(1))" onclick="x"><h5>Hi</h5><script>alert(1)</script><a href="javascript:x" style="color:red">l</a></div>`);
  assert.ok(clean.includes("color:#b58c61") && clean.includes("padding:16px"));
  for (const bad of ["position", "url(", "expression", "onclick", "<script", "javascript:"]) assert.ok(!clean.includes(bad), `${bad} survived: ${clean}`);
});

/* ---------------------------------------------------------------- database */

let mongod: ChildProcess | undefined;
let dataDir = "";
let ready = false;
const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });

before(async () => {
  try {
    dataDir = mkdtempSync(path.join(tmpdir(), "mindvines-cms-"));
    const port = await freePort();
    mongod = spawn("mongod", ["--dbpath", dataDir, "--port", String(port), "--bind_ip", "127.0.0.1", "--quiet"], { stdio: "ignore" });
    mongod.on("error", () => {});
    process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/mindvines_cms_test`;
    process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-123";
    const { default: mongoose } = await import("mongoose");
    for (let attempt = 0; attempt < 40 && !ready; attempt += 1) {
      try {
        await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 500 });
        ready = true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  } catch {
    ready = false;
  }
});
after(async () => {
  const { default: mongoose } = await import("mongoose");
  await mongoose.disconnect().catch(() => {});
  if (mongod && mongod.exitCode === null) {
    const exited = new Promise((resolve) => mongod!.once("exit", resolve));
    mongod.kill("SIGTERM");
    await exited;
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const db = (name: string, fn: () => Promise<void>) =>
  test(name, async (context) => {
    if (!ready) return context.skip("mongod is not available");
    await fn();
  });

const user = () => new Types.ObjectId().toString();
const svc = () => import("../src/services/cms-page.service");

async function draftWithSections(slug: string, heading = "Hello") {
  const s = await svc();
  const u = user();
  const id = await s.createCmsPage({ title: "Page " + slug, slug }, u);
  const hero = newSection("hero", "hero-" + slug.slice(0, 20));
  hero.data.heading = heading;
  await s.saveDraft(id, page({ title: "Page " + slug, slug, sections: [hero] }), u);
  return { s, id, u, hero };
}

db("a draft is never public; publishing makes it live; unpublishing hides it again", async () => {
  const { s, id, u } = await draftWithSections("draft-flow");
  assert.equal(await s.readPublishedPage("draft-flow"), null);
  const result = await s.publishPage(id, u);
  assert.equal(result.versionNumber, 1);
  const live = await s.readPublishedPage("draft-flow");
  assert.equal(live?.sections.length, 1);
  await s.unpublishPage(id, u);
  assert.equal(await s.readPublishedPage("draft-flow"), null);
  // Its content is kept: publishing again works.
  await s.publishPage(id, u);
  assert.ok(await s.readPublishedPage("draft-flow"));
});

db("editing a live page changes only the draft until it is published", async () => {
  const { s, id, u, hero } = await draftWithSections("live-edit", "Version one");
  await s.publishPage(id, u);
  const edited = { ...hero, data: { ...hero.data, heading: "Version two" } };
  await s.saveDraft(id, page({ title: "Page live-edit", slug: "live-edit", sections: [edited] }), u);
  const live = await s.readPublishedPage("live-edit");
  assert.equal((live?.sections[0].data as { heading: string }).heading, "Version one");
  const editor = await s.getPageForEditor(id);
  assert.equal((editor?.content.sections[0].data as { heading: string }).heading, "Version two");
  await s.publishPage(id, u);
  assert.equal(((await s.readPublishedPage("live-edit"))?.sections[0].data as { heading: string }).heading, "Version two");
  assert.equal((await s.listVersions(id)).length, 2);
});

db("restoring a version goes into the draft and leaves the live page alone", async () => {
  const { s, id, u, hero } = await draftWithSections("restore-me", "Original");
  await s.publishPage(id, u);
  await s.saveDraft(id, page({ title: "Page restore-me", slug: "restore-me", sections: [{ ...hero, data: { ...hero.data, heading: "Changed" } }] }), u);
  await s.publishPage(id, u);
  await s.restoreVersion(id, 1, u);
  assert.equal(((await s.readPublishedPage("restore-me"))?.sections[0].data as { heading: string }).heading, "Changed");
  assert.equal(((await s.getPageForEditor(id))?.content.sections[0].data as { heading: string }).heading, "Original");
});

db("changing the address of a live page redirects the old one", async () => {
  const { s, id, u, hero } = await draftWithSections("old-address");
  await s.publishPage(id, u);
  await s.saveDraft(id, page({ title: "Moved", slug: "new-address", sections: [hero] }), u);
  await s.publishPage(id, u);
  assert.ok(await s.readPublishedPage("new-address"));
  assert.equal(await s.readPublishedPage("old-address"), null);
  assert.equal(await s.findRedirect("old-address"), "new-address");
  // A second move keeps the first old address pointing at the newest one (no chains).
  await s.saveDraft(id, page({ title: "Moved again", slug: "newest-address", sections: [hero] }), u);
  await s.publishPage(id, u);
  assert.equal(await s.findRedirect("old-address"), "newest-address");
  assert.equal(await s.findRedirect("new-address"), "newest-address");
});

db("two pages cannot share an address, even through a pending draft", async () => {
  const { s, u } = await draftWithSections("taken-one");
  await assert.rejects(s.createCmsPage({ title: "Other", slug: "taken-one" }, u), /already uses/);
  const other = await s.createCmsPage({ title: "Other", slug: "taken-two" }, u);
  await assert.rejects(s.saveDraft(other, page({ slug: "taken-one" }), u), /already uses/);
  await assert.rejects(s.createCmsPage({ title: "Admin", slug: "admin" }, u), /website itself/);
});

db("scheduled pages go live only once their time has come", async () => {
  const { s, id, u } = await draftWithSections("scheduled-page");
  const when = new Date(Date.now() + 60_000);
  const result = await s.publishPage(id, u, { publishAt: when });
  assert.equal(result.scheduled, true);
  assert.equal(await s.readPublishedPage("scheduled-page"), null);
  await assert.rejects(s.publishPage(id, u, { publishAt: new Date(Date.now() - 1000) }), /future/);
  assert.deepEqual(await s.promoteDueSchedules(new Date(Date.now() + 1000)), []);
  assert.equal(await s.readPublishedPage("scheduled-page"), null);
  const promoted = await s.promoteDueSchedules(new Date(Date.now() + 120_000));
  assert.ok(promoted.includes("scheduled-page"));
  assert.ok(await s.readPublishedPage("scheduled-page"));
  // Running again does nothing more.
  assert.deepEqual(await s.promoteDueSchedules(new Date(Date.now() + 240_000)), []);
});

db("a page saved before the builder existed still renders, cleaned", async () => {
  const { Page } = await import("../src/models/Page");
  await Page.create({ title: "Old page", slug: "old-legacy", status: "PUBLISHED", content: `<p>Legacy</p><script>alert(1)</script>`, publishedAt: new Date() });
  const { s } = await svc().then((s) => ({ s }));
  const live = await s.readPublishedPage("old-legacy");
  assert.ok(live);
  const html = (live.sections[0].data as { html: string }).html;
  assert.ok(html.includes("Legacy") && !html.includes("<script"));
});

db("system pages keep their layout: no builder edits, SEO overrides only, never in the page list as CMS", async () => {
  const { s } = await draftWithSections("regular-page");
  const u = user();
  await s.saveSystemSeo("terms", { seo: { ...EMPTY_SEO, title: "Terms | Custom", description: "Custom description" } }, u);
  assert.equal((await s.getSystemSeo("terms"))?.title, "Terms | Custom");
  assert.equal(await s.getSystemSeo("pilot"), null);
  await assert.rejects(s.saveSystemSeo("not-a-page", { seo: EMPTY_SEO }, u), /doesn't exist/);
  await assert.rejects(s.saveSystemSeo("terms", { seo: { ...EMPTY_SEO, ogImage: "https://evil.example/x.png" } }, u));
  const list = await s.listCmsPagesAdmin({});
  assert.ok(list.cms.every((item) => !item.slug.startsWith("__system")));
  assert.equal(list.system.length, 7);
  assert.equal(list.system.find((item) => item.key === "terms")?.seoEdited, true);
  // A system record is never served as a CMS page at its storage address, and can't be deleted or duplicated.
  const { Page } = await import("../src/models/Page");
  const doc = await Page.findOne({ systemKey: "terms" });
  assert.equal(await s.readPublishedPage("__system:terms"), null);
  assert.equal(await s.deleteCmsPage(String(doc!._id)), null);
  await assert.rejects(s.duplicatePage(String(doc!._id), u));
});

db("sitemap lists only published, indexable pages that opted in", async () => {
  const { s, id, u, hero } = await draftWithSections("in-sitemap");
  await s.publishPage(id, u);
  const hidden = await s.createCmsPage({ title: "Hidden", slug: "not-in-sitemap" }, u);
  await s.saveDraft(hidden, page({ title: "Hidden", slug: "not-in-sitemap", sections: [hero].map((x) => ({ ...x, id: "other-hero" })), seo: { ...EMPTY_SEO, sitemap: false } }), u);
  await s.publishPage(hidden, u);
  const noindex = await s.createCmsPage({ title: "Noindex", slug: "no-index-page" }, u);
  await s.saveDraft(noindex, page({ title: "Noindex", slug: "no-index-page", seo: { ...EMPTY_SEO, index: false } }), u);
  await s.publishPage(noindex, u);
  const slugs = (await s.listSitemapPages()).map((item) => item.slug);
  assert.ok(slugs.includes("in-sitemap"));
  assert.ok(!slugs.includes("not-in-sitemap"));
  assert.ok(!slugs.includes("no-index-page"));
  assert.ok(!slugs.includes("draft-flow") || (await s.readPublishedPage("draft-flow")) !== null);
});

db("publishing re-sanitises content that was stored directly", async () => {
  const { s, id, u } = await draftWithSections("tampered");
  const { Page } = await import("../src/models/Page");
  await Page.updateOne({ _id: id }, { $set: { "draft.sections.0.data.heading": "<script>alert(1)</script>Safe", "draft.sections.0.data.buttons": [{ text: "x", url: "javascript:alert(1)" }] } });
  await assert.rejects(s.publishPage(id, u));
  assert.equal(await s.readPublishedPage("tampered"), null);
});

db("deleting a page removes its versions and redirects", async () => {
  const { s, id, u, hero } = await draftWithSections("to-delete");
  await s.publishPage(id, u);
  await s.saveDraft(id, page({ title: "Moved", slug: "deleted-new", sections: [hero] }), u);
  await s.publishPage(id, u);
  assert.equal(await s.deleteCmsPage(id), "deleted-new");
  assert.equal(await s.readPublishedPage("deleted-new"), null);
  assert.equal(await s.findRedirect("to-delete"), null);
  assert.equal((await s.listVersions(id)).length, 0);
});

db("a built-in page opens as its current layout, can be edited, published, reverted and restored", async () => {
  const s = await svc();
  const u = user();
  const id = (await s.getSystemPageId("terms", u))!;
  const opened = await s.getPageForEditor(id);
  assert.equal(opened?.systemKey, "terms");
  assert.equal(opened?.content.sections.length, 1);
  assert.equal(opened?.isLive, false);
  // Nothing customised: the built-in layout is used.
  assert.equal(await s.readSystemLayout("terms"), null);

  const section = opened!.content.sections[0];
  assert.equal(section.type, "component");
  const props = { ...(section.data as { props: Record<string, unknown> }).props, body: "## 1. New\n\nEdited <script>alert(1)</script>text" };
  const edited = { ...opened!.content, sections: [{ ...section, data: { component: "legalDocument", props } }] };
  await s.saveDraft(id, edited, u);
  assert.equal(await s.readSystemLayout("terms"), null, "a draft never reaches the live page");

  const published = await s.publishPage(id, u);
  assert.equal(published.versionNumber, 1);
  const live = await s.readSystemLayout("terms");
  const liveProps = (live!.sections[0].data as unknown as { props: { body: string } }).props;
  assert.ok(liveProps.body.includes("Edited") && !liveProps.body.includes("<script"));
  assert.equal((await s.getPageForEditor(id))?.isLive, true);

  // Reverting goes back to the code layout but keeps the history.
  await s.unpublishPage(id, u);
  assert.equal(await s.readSystemLayout("terms"), null);
  assert.equal((await s.listVersions(id)).length, 1);
  await s.publishPage(id, u);
  assert.ok(await s.readSystemLayout("terms"));

  // The address of a built-in page can't be changed by editing.
  await s.saveDraft(id, { ...edited, slug: "hijacked" }, u);
  const { Page } = await import("../src/models/Page");
  assert.equal((await Page.findById(id))!.slug, "__system:terms");
  await s.publishPage(id, u);
  assert.equal((await Page.findById(id))!.slug, "__system:terms");
  assert.equal(await s.findRedirect("__system:terms"), null);
});

db("home page layout: components can be reordered and hidden, and SEO saves stay in step with a draft", async () => {
  const s = await svc();
  const u = user();
  const id = (await s.getSystemPageId("home", u))!;
  const opened = await s.getPageForEditor(id);
  const kinds = opened!.content.sections.map((section) => (section.data as { component: string }).component);
  assert.deepEqual(kinds, SYSTEM_LAYOUTS.home);

  const [hero, ...rest] = opened!.content.sections;
  const reordered = [...rest.slice(0, 2), { ...hero, visible: false }, ...rest.slice(2)];
  await s.saveDraft(id, { ...opened!.content, sections: reordered }, u);
  await s.saveSystemSeo("home", { seo: { ...EMPTY_SEO, title: "New home title" } }, u);
  await s.publishPage(id, u);
  const live = await s.readSystemLayout("home");
  assert.equal(live!.sections.length, SYSTEM_LAYOUTS.home.length - 1, "hidden sections are not served");
  assert.equal((live!.sections[0].data as { component: string }).component, "journey");
  assert.equal((await s.getSystemSeo("home"))?.title, "New home title", "publishing did not undo the SEO save");
});

db("functional components keep their place on the pilot and plans pages", async () => {
  const s = await svc();
  const u = user();
  for (const key of ["pilot", "subscriptions", "renew"] as const) {
    const id = (await s.getSystemPageId(key, u))!;
    const opened = await s.getPageForEditor(id);
    const components = opened!.content.sections.map((section) => (section.data as { component: string }).component);
    assert.deepEqual(components, SYSTEM_LAYOUTS[key]);
  }
  // The renewal flow takes no content at all: nothing an admin can send changes how it works.
  const id = (await s.getSystemPageId("renew", u))!;
  const opened = await s.getPageForEditor(id);
  const sec = opened!.content.sections[0];
  await s.saveDraft(id, { ...opened!.content, sections: [{ ...sec, data: { component: "renewalFlow", props: { onSubmit: "alert(1)", url: "https://evil.example" } } }] }, u);
  await s.publishPage(id, u);
  assert.deepEqual((await s.readSystemLayout("renew"))!.sections[0].data, { component: "renewalFlow", props: {} });
});
