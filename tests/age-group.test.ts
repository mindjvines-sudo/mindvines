import assert from "node:assert/strict";
import test from "node:test";
import { ageGroupInputSchema } from "../src/validations/age-group.schema";

const group = (plans: Record<string, unknown> = {}) => ({
  title: "Ages 6–8",
  slug: "ages-6-8",
  hero: {},
  highlights: { slides: [], cta: {} },
  stats: {},
  plans: { ageGroup: "6-8", heading: "Choose your subscription plan", priceNote: "plus GST", footnote: "Switch or cancel anytime", ...plans },
  gallery: {},
  testimonials: {},
  seo: {},
  status: "DRAFT",
});

test("the plan band keeps its age group, heading and notes", () => {
  const { plans } = ageGroupInputSchema.parse(group());
  assert.equal(plans.ageGroup, "6-8");
  assert.equal(plans.priceNote, "plus GST");
  assert.equal(plans.show, true);
});

test("the plan band can be hidden or left without an age group", () => {
  assert.equal(ageGroupInputSchema.parse(group({ show: false })).plans.show, false);
  assert.equal(ageGroupInputSchema.parse(group({ ageGroup: "" })).plans.ageGroup, "");
});

test("rejects an age group Subscriptions doesn't have", () => {
  assert.equal(ageGroupInputSchema.safeParse(group({ ageGroup: "13-15" })).success, false);
});
