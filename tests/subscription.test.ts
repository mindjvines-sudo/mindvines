import assert from "node:assert/strict";
import test from "node:test";
import { subscriptionInputSchema } from "../src/validations/subscription.schema";
import { toPlanOptions } from "../src/lib/plan-options";
import { can } from "../src/lib/permissions";

const plan = {
  name: "Sketching journey",
  description: "A shared sketching journal programme.",
  ageGroup: "6-8",
  price: "1499.50",
  durationMonths: "3",
  journalCount: "6",
  features: ["Doorstep delivery"],
  registrationUrl: "",
  featured: false,
  displayOrder: "0",
  status: "DRAFT",
};

test("form values become a valid subscription plan, including a free plan", () => {
  const parsed = subscriptionInputSchema.parse(plan);
  assert.equal(parsed.price, 1499.5);
  assert.equal(parsed.durationMonths, 3);
  assert.equal(subscriptionInputSchema.parse({ ...plan, price: "0" }).price, 0);
});

test("rejects missing and invalid pricing, fractional durations, and unsupported age groups", () => {
  for (const input of [
    { price: "" }, { price: null }, { price: "-1" }, { price: "Infinity" },
    { price: "12.345" }, { durationMonths: "1.5" }, { durationMonths: "0" },
    { journalCount: "0" }, { displayOrder: "-1" }, { ageGroup: "13-16" },
    { name: " " }, { description: " " }, { status: "ACTIVE" },
  ]) {
    assert.equal(subscriptionInputSchema.safeParse({ ...plan, ...input }).success, false, JSON.stringify(input));
  }
});

test("registration links reject executable and protocol-relative URLs", () => {
  for (const registrationUrl of ["javascript:alert(1)", "data:text/html,test", "//example.com", "/\\example.com", "https://user:pass@example.com", "invalid"]) {
    assert.equal(subscriptionInputSchema.safeParse({ ...plan, registrationUrl }).success, false, registrationUrl);
  }
  for (const registrationUrl of ["", "/registration?plan=sketching", "https://example.com/register"]) {
    assert.equal(subscriptionInputSchema.safeParse({ ...plan, registrationUrl }).success, true, registrationUrl);
  }
});

test("limits benefit count and length", () => {
  assert.equal(subscriptionInputSchema.safeParse({ ...plan, features: Array(21).fill("Benefit") }).success, false);
  assert.equal(subscriptionInputSchema.safeParse({ ...plan, features: ["x".repeat(201)] }).success, false);
});

test("subscription management is restricted to admins", () => {
  for (const action of ["read", "create", "update", "publish", "delete"] as const) {
    assert.equal(can("ADMIN", action, "subscriptions"), true);
    assert.equal(can("SUPER_ADMIN", action, "subscriptions"), true);
    assert.equal(can("EDITOR", action, "subscriptions"), false);
  }
});


const published = (id: string, name: string, price: number, durationMonths: number, displayOrder = 0, extra = {}) => ({
  _id: id, name, price, durationMonths, displayOrder, featured: false, ...extra,
});

test("plans group into duration tabs, shortest first, each with its own cards", () => {
  const tabs = toPlanOptions([
    published("a", "Writing only", 3240, 12, 1),
    published("b", "Both", 5760, 12, 0, { featured: true, buttonLabel: "Choose both" }),
    published("c", "Writing only", 370, 1, 0),
    published("d", "Writing only", 900, 3, 0, { badge: "Save 19%" }),
  ]);
  assert.deepEqual(tabs.map((tab) => tab.tab), ["Monthly", "3 months", "12 months"]);
  assert.deepEqual(tabs[2].cards.map((card) => card.title), ["Both", "Writing only"]);
  assert.equal(tabs[2].cards[0].buttonLabel, "Choose both");
  assert.equal(tabs[2].cards[0].highlight, true);
  assert.equal(tabs[2].cards[1].buttonLabel, "Subscribe now");
  assert.equal(tabs[2].cards[1].buttonHref, "/checkout/a");
  assert.equal(tabs[1].cards[0].badge, "Save 19%");
});

test("a new duration appears on its own and an empty list gives no tabs", () => {
  assert.deepEqual(toPlanOptions([published("a", "x", 1, 6), published("b", "x", 1, 1)]).map((t) => t.tab), ["Monthly", "6 months"]);
  assert.equal(toPlanOptions([published("a", "x", 1, 6)])[0].cards[0].period, "6 months");
  assert.deepEqual(toPlanOptions([]), []);
});
