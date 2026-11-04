import assert from "node:assert/strict";
import test from "node:test";
import { subscriptionInputSchema } from "../src/validations/subscription.schema";
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
