import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { Types } from "mongoose";
import { DEFAULT_DISABLED_MESSAGE, isListed, planAvailability, planRefusal } from "../src/lib/plan-availability";
import { toPlanOptions } from "../src/lib/plan-options";
import { subscriptionInputSchema } from "../src/validations/subscription.schema";

/* ------------------------------------------------------------- pure rules */

const legacy = { status: "PUBLISHED" }; // saved before the controls existed: no fields at all

test("a plan with no controls behaves exactly as before", () => {
  assert.equal(planAvailability(legacy), "AVAILABLE");
  assert.equal(planRefusal(legacy), null);
});

test("each switch has its own effect", () => {
  assert.equal(planAvailability({ ...legacy, subscribeEnabled: false }), "BUTTON_DISABLED");
  assert.equal(planAvailability({ ...legacy, cardVisible: false }), "HIDDEN");
  assert.equal(planAvailability({ ...legacy, subscriptionActive: false }), "INACTIVE");
  assert.equal(planAvailability({ status: "DRAFT" }), "UNPUBLISHED");
  assert.equal(isListed("BUTTON_DISABLED"), true);
  for (const hidden of ["HIDDEN", "INACTIVE", "UNPUBLISHED"] as const) assert.equal(isListed(hidden), false);
});

test("refusals carry the admin's message for a disabled button, and a plain one otherwise", () => {
  assert.equal(planRefusal({ ...legacy, subscribeEnabled: false, disabledMessage: "Back in January" }), "Back in January");
  assert.equal(planRefusal({ ...legacy, subscribeEnabled: false, disabledMessage: "  " }), DEFAULT_DISABLED_MESSAGE);
  assert.match(planRefusal({ ...legacy, cardVisible: false })!, /no longer available/);
  assert.match(planRefusal({ ...legacy, subscriptionActive: false })!, /no longer available/);
});

test("a disabled-button plan becomes a card with no link target worth following and its message", () => {
  const base = { _id: "p1", name: "Three months", price: 900, durationMonths: 3, featured: false };
  const [tab] = toPlanOptions([{ ...base, subscribeEnabled: false, disabledMessage: "Full for now" }]);
  assert.equal(tab.cards[0].disabled, true);
  assert.equal(tab.cards[0].disabledMessage, "Full for now");
  assert.equal(toPlanOptions([base])[0].cards[0].disabled, undefined);
});

const form = {
  name: "Sketching", description: "d", ageGroup: "6-8", price: "900", durationMonths: "3", journalCount: "3",
  programme: "6aeb766064f4e9a49fc2e0af", features: [], registrationUrl: "", featured: false, displayOrder: "0", status: "PUBLISHED",
};

test("the form defaults the switches on, and limits the message", () => {
  const parsed = subscriptionInputSchema.parse(form);
  assert.deepEqual([parsed.subscriptionActive, parsed.cardVisible, parsed.subscribeEnabled, parsed.disabledMessage], [true, true, true, ""]);
  assert.equal(subscriptionInputSchema.parse({ ...form, subscribeEnabled: false }).subscribeEnabled, false);
  assert.equal(subscriptionInputSchema.safeParse({ ...form, disabledMessage: "x".repeat(161) }).success, false);
});

/* ------------------------------------------- database-backed scenarios
 * These run against a throwaway mongod started on a free port in a temp
 * directory, never the project's database. Skipped when mongod isn't installed. */

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
    dataDir = mkdtempSync(path.join(tmpdir(), "mindvines-planctl-"));
    const port = await freePort();
    mongod = spawn("mongod", ["--dbpath", dataDir, "--port", String(port), "--bind_ip", "127.0.0.1", "--quiet"], { stdio: "ignore" });
    mongod.on("error", () => {});
    process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/mindvines_planctl_test`;
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


async function load() {
  const [{ SubscriptionPlan }, { Subscription }, plans, registrations, { LISTED_PLAN_FILTER }] = await Promise.all([
    import("../src/models/SubscriptionPlan"),
    import("../src/models/Subscription"),
    import("../src/services/subscription.service"),
    import("../src/services/registration.service"),
    import("../src/lib/plan-availability"),
  ]);
  return { SubscriptionPlan, Subscription, plans, registrations, LISTED_PLAN_FILTER };
}

let n = 0;
async function makePlan(over: Record<string, unknown> = {}) {
  const { SubscriptionPlan } = await load();
  n += 1;
  return SubscriptionPlan.create({ name: `Plan ${n}`, description: "d", ageGroup: "6-8", price: 900, durationMonths: 3, journalCount: 3, status: "PUBLISHED", ...over });
}

const attempt = async (planId: string) => {
  const { registrations } = await load();
  // The plan is judged before the details are looked at, so none are needed to see the refusal.
  return registrations.saveRegistrationDetails({ planId, details: {} as never });
};

db("public lists show active visible plans (button on or off) and nothing else", async () => {
  const { plans } = await load();
  const on = await makePlan({ name: "ListedOn" });
  const off = await makePlan({ name: "ListedButtonOff", subscribeEnabled: false });
  await makePlan({ name: "Hidden", cardVisible: false });
  await makePlan({ name: "Inactive", subscriptionActive: false });
  await makePlan({ name: "Draft", status: "DRAFT" });
  const names = (await plans.listPublishedSubscriptionPlans()).map((plan) => plan.name);
  assert.ok(names.includes("ListedOn") && names.includes("ListedButtonOff"));
  assert.ok(!["Hidden", "Inactive", "Draft"].some((name) => names.includes(name)));
  const forAge = (await plans.listPublishedSubscriptionPlansForAge("6-8")).map((plan) => plan.name);
  assert.ok(!forAge.includes("Hidden") && !forAge.includes("Inactive"));
  assert.ok(on && off);
});

db("a plan saved before the controls existed is listed and orderable", async () => {
  const { SubscriptionPlan, plans } = await load();
  const doc = await makePlan({ name: "Legacy" });
  await SubscriptionPlan.collection.updateOne({ _id: doc._id }, { $unset: { subscriptionActive: "", cardVisible: "", subscribeEnabled: "", disabledMessage: "" } });
  assert.ok((await plans.listPublishedSubscriptionPlans()).some((plan) => plan.name === "Legacy"));
  const raw = await SubscriptionPlan.findById(doc._id).lean();
  assert.equal(planAvailability(raw!), "AVAILABLE");
});

db("direct attempts to register for a hidden, inactive or button-disabled plan are refused by the server", async () => {
  const hidden = await makePlan({ cardVisible: false });
  const inactive = await makePlan({ subscriptionActive: false });
  const disabled = await makePlan({ subscribeEnabled: false, disabledMessage: "Opening again in March" });
  const draft = await makePlan({ status: "DRAFT" });
  for (const plan of [hidden, inactive, draft]) {
    await assert.rejects(() => attempt(plan._id.toString()), (error: Error & { code?: string }) => error.code === "PLAN_UNAVAILABLE" && /no longer available/.test(error.message));
  }
  await assert.rejects(() => attempt(disabled._id.toString()), (error: Error & { code?: string }) => error.code === "PLAN_UNAVAILABLE" && error.message === "Opening again in March");
  await assert.rejects(() => attempt(new Types.ObjectId().toString()), /no longer available/);
});

db("an enabled plan passes the plan check (it then fails only on the missing details)", async () => {
  const plan = await makePlan();
  await assert.rejects(() => attempt(plan._id.toString()), (error: Error & { code?: string }) => error.code !== "PLAN_UNAVAILABLE");
});

db("switching a plan off and on again keeps its configuration and never touches existing subscriptions", async () => {
  const { plans, Subscription, SubscriptionPlan } = await load();
  const plan = await makePlan({ name: "Toggled", features: ["Doorstep delivery"], badge: "Save 10%" });
  const subscription = await Subscription.create({
    plan: plan._id, planSnapshot: { name: "Toggled", ageGroup: "6-8", price: 900, durationMonths: 3 },
    registration: { name: "Asha", email: "asha@example.com", phone: "1" }, status: "ACTIVE",
    startDate: new Date(), expiryDate: new Date(Date.now() + 60 * 86_400_000),
  });
  const before = await Subscription.findById(subscription._id).lean();

  const input = subscriptionInputSchema.parse({ ...form, name: "Toggled", features: ["Doorstep delivery"], badge: "Save 10%", subscriptionActive: false, cardVisible: false, subscribeEnabled: false, disabledMessage: "Paused" });
  const by = new Types.ObjectId().toString();
  const paused = await plans.updateSubscriptionPlan(plan._id.toString(), input, by);
  assert.deepEqual([paused?.subscriptionActive, paused?.cardVisible, paused?.subscribeEnabled, paused?.disabledMessage], [false, false, false, "Paused"]);
  assert.equal(String(paused?.updatedBy), by);
  assert.ok(!(await plans.listPublishedSubscriptionPlans()).some((item) => item.name === "Toggled"));
  await assert.rejects(() => attempt(plan._id.toString()), /no longer available/);

  // Existing subscriber: unchanged, still active, still pointing at the plan.
  assert.deepEqual(await Subscription.findById(subscription._id).lean(), before);

  const back = await plans.updateSubscriptionPlan(plan._id.toString(), subscriptionInputSchema.parse({ ...form, name: "Toggled", features: ["Doorstep delivery"], badge: "Save 10%" }), by);
  assert.deepEqual([back?.subscriptionActive, back?.cardVisible, back?.subscribeEnabled], [true, true, true]);
  assert.deepEqual([back?.features, back?.badge, back?.price], [["Doorstep delivery"], "Save 10%", 900]);
  assert.ok((await plans.listPublishedSubscriptionPlans()).some((item) => item.name === "Toggled"));
  await assert.rejects(() => attempt(plan._id.toString()), (error: Error & { code?: string }) => error.code !== "PLAN_UNAVAILABLE");
  assert.ok(await SubscriptionPlan.exists({ _id: plan._id }));
});

db("renewals still see a disabled plan's subscribers' plans as published (renewal rules are untouched)", async () => {
  // The renewal service lists and prices plans by `status: PUBLISHED` only; the switches are never consulted there.
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(path.join(process.cwd(), "src/services/renewal.service.ts"), "utf8");
  assert.ok(!/plan-availability|subscribeEnabled|cardVisible|subscriptionActive/.test(source));
});

db("an admin can tick a topic as already sent, without touching the other topics", async () => {
  const { setTopicSent } = await import("../src/services/subscriber.service");
  const { Registration } = await import("../src/models/Registration");
  const category = new Types.ObjectId();
  const [a, b] = [new Types.ObjectId(), new Types.ObjectId()];
  const doc = await Registration.collection.insertOne({
    reference: `MV-T${Date.now()}`, status: "COMPLETED", plan: new Types.ObjectId(),
    preferences: { selections: [{ category, categoryName: "Writing", topics: [{ topic: a, title: "A" }, { topic: b, title: "B" }] }] },
  });
  const id = doc.insertedId.toString();
  assert.equal(await setTopicSent(id, category.toString(), a.toString(), true), true);
  let topics = (await Registration.findById(id).lean())!.preferences!.selections![0].topics;
  assert.deepEqual(topics.map((t) => Boolean(t.sent)), [true, false]);
  assert.ok(topics[0].sentAt);
  await setTopicSent(id, category.toString(), a.toString(), false);
  topics = (await Registration.findById(id).lean())!.preferences!.selections![0].topics;
  assert.deepEqual(topics.map((t) => Boolean(t.sent)), [false, false]);
  assert.equal(topics[0].sentAt, undefined);
  assert.equal(await setTopicSent("nope", category.toString(), a.toString(), true), false);
});
