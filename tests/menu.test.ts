import assert from "node:assert/strict";
import test from "node:test";
import { buildMenu, DEFAULT_MENU, menuGroupLinks, type MenuConfigItem } from "../src/lib/content";
import { SiteSettings } from "../src/models/SiteSettings";
import { menuSchema } from "../src/validations/menu.schema";

const agePages = [{ ageGroup: "6-8", slug: "sketching" }, { ageGroup: "9-12", slug: "writing" }];
const plans: MenuConfigItem = { kind: "plans", label: "Subscription plans", href: "" };
const topics: MenuConfigItem = { kind: "topics", label: "A glimpse of topics", href: "" };

test("existing menus retain their default dropdown names and destinations", () => {
  assert.deepEqual(buildMenu(agePages, [plans, topics]), [
    { label: plans.label, children: [{ label: "Ages 6-8", href: "/subscriptions?age=6-8" }, { label: "Ages 9-12", href: "/subscriptions?age=9-12" }] },
    { label: topics.label, children: [{ label: "Ages 6-8 yrs", href: "/age-groups/sketching#topics" }, { label: "Ages 9-12 yrs", href: "/age-groups/writing#topics" }] },
  ]);
  assert.ok(menuSchema.safeParse(DEFAULT_MENU).success);
  assert.ok(menuSchema.safeParse([]).success, "an empty list restores the default menu");
});

test("each dropdown uses its own saved name and URL overrides", () => {
  const config: MenuConfigItem[] = [
    { ...plans, children: [{ ageGroup: "6-8", label: "Younger writers", href: "/our-plans#younger" }] },
    { ...topics, children: [{ ageGroup: "6-8", href: "https://example.com/topics" }] },
  ];
  const menu = buildMenu(agePages, menuSchema.parse(config));
  assert.deepEqual(menu[0].children?.[0], { label: "Younger writers", href: "/our-plans#younger" });
  assert.deepEqual(menu[0].children?.[1], { label: "Ages 9-12", href: "/subscriptions?age=9-12" });
  assert.deepEqual(menu[1].children?.[0], { label: "Ages 6-8 yrs", href: "https://example.com/topics" });
});

test("name-only overrides keep following the current published page URL", () => {
  const config = { ...topics, children: [{ ageGroup: "6-8", label: "Little artists" }] };
  assert.equal(menuGroupLinks(config, [{ ageGroup: "6-8", slug: "new-sketching-page" }])[0].href, "/age-groups/new-sketching-page#topics");
  assert.equal(menuGroupLinks(config, agePages)[0].label, "Little artists");
  assert.equal(menuGroupLinks({ ...config, children: undefined }, agePages)[0].label, "Ages 6-8 yrs");
});

test("saved overrides stay with their age group when published pages change order", () => {
  const config = { ...topics, children: [{ ageGroup: "9-12", href: "/older-topics" }] };
  assert.equal(menuGroupLinks(config, [...agePages].reverse())[0].href, "/older-topics");
  assert.equal(menuGroupLinks(config, agePages)[0].href, "/age-groups/sketching#topics");
});

test("hidden groups and unpublished topic pages remain absent from the public menu", () => {
  assert.deepEqual(buildMenu(agePages, [{ ...plans, hidden: true }]), []);
  assert.deepEqual(buildMenu([], [{ ...topics, children: [{ ageGroup: "6-8", href: "/custom" }] }]), []);
  assert.equal(buildMenu([], [plans])[0].children?.length, 2);
});

test("menu overrides survive database schema casting and serialization", async () => {
  const config = menuSchema.parse([{ ...plans, children: [{ ageGroup: "9-12", label: "Older children", href: "/older-plans" }] }]);
  const settings = new SiteSettings({ siteName: "Mindvines", menuItems: config });
  await settings.validate();
  const persisted = JSON.parse(JSON.stringify(settings.toObject().menuItems));
  assert.deepEqual(persisted[0].children, config[0].children);
  assert.deepEqual(buildMenu(agePages, persisted)[0].children?.[1], { label: "Older children", href: "/older-plans" });
});

test("validation rejects unsafe, empty and overlong dropdown URLs", () => {
  for (const href of ["", "javascript:alert(1)", "data:text/html,test", "//evil.example", "/\\evil.example", "https://user:password@example.com", "https://", `/${"x".repeat(300)}`]) {
    assert.equal(menuSchema.safeParse([{ ...plans, children: [{ ageGroup: "6-8", href }] }]).success, false, href);
  }
  for (const href of ["/#plans", "#plans", "/subscriptions?age=6-8", "https://example.com/plans", "mailto:hello@example.com", "tel:+911234567890"]) {
    assert.ok(menuSchema.safeParse([{ ...plans, children: [{ ageGroup: "6-8", href }] }]).success, href);
  }
});

test("validation rejects blank names, unknown ages and duplicate age-group overrides", () => {
  for (const children of [
    [{ ageGroup: "6-8", label: " " }],
    [{ ageGroup: "13-15", href: "/plans" }],
    [{ ageGroup: "6-8", href: "/one" }, { ageGroup: "6-8", href: "/two" }],
  ]) assert.equal(menuSchema.safeParse([{ ...plans, children }]).success, false);
  assert.equal(menuSchema.safeParse([{ kind: "link", label: "Home", href: "" }]).success, false);
  const parsed = menuSchema.parse([{ ...plans, children: [{ ageGroup: "6-8", label: "  Younger  ", href: " /younger " }] }]);
  assert.deepEqual(parsed[0].children?.[0], { ageGroup: "6-8", label: "Younger", href: "/younger" });
});
