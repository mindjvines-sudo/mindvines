import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after, before } from "node:test";
import { Types } from "mongoose";
import {
  PILOT_RESERVATION_MS,
  durationMonths,
  newAccessCode,
  normaliseAccessCode,
  offerPrice,
  pilotAvailability,
  savingsPercent,
  slotsLeft,
} from "../src/lib/pilot";
import { pilotPlanInputSchema } from "../src/validations/pilot.schema";
import { can } from "../src/lib/permissions";

/* ------------------------------------------------------------- pure rules */

test("the pilot price is worked out from the original price and the discount, never below zero", () => {
  assert.equal(offerPrice(550, "FIXED", 180), 370);
  assert.equal(offerPrice(1500, "PERCENTAGE", 33.4), 999);
  assert.equal(offerPrice(100, "PERCENTAGE", 100), 0);
  assert.equal(offerPrice(100, "FIXED", 500), 0);
  assert.equal(savingsPercent(550, 370), 33);
  assert.equal(savingsPercent(550, 550), 0);
});

test("durations map to months, with a custom length when asked", () => {
  assert.equal(durationMonths("MONTHLY"), 1);
  assert.equal(durationMonths("THREE_MONTHS"), 3);
  assert.equal(durationMonths("SIX_MONTHS"), 6);
  assert.equal(durationMonths("CUSTOM", 9), 9);
});

const basePlan = (over: Record<string, unknown> = {}) => ({
  status: "ACTIVE" as const,
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-12-31"),
  maxRegistrations: 3,
  registrationCount: 0,
  reservedCount: 0,
  ...over,
});
const clock = new Date("2026-06-01");

test("availability follows status, window and slots, and reopens when a slot is freed", () => {
  assert.equal(pilotAvailability(basePlan(), clock), "OPEN");
  assert.equal(pilotAvailability(basePlan({ status: "INACTIVE" }), clock), "INACTIVE");
  assert.equal(pilotAvailability(basePlan({ startDate: new Date("2026-07-01") }), clock), "NOT_STARTED");
  assert.equal(pilotAvailability(basePlan({ endDate: new Date("2026-05-01") }), clock), "ENDED");
  assert.equal(pilotAvailability(basePlan({ registrationCount: 2, reservedCount: 1 }), clock), "FULLY_BOOKED");
  assert.equal(pilotAvailability(basePlan({ registrationCount: 2, reservedCount: 0 }), clock), "OPEN");
  assert.equal(slotsLeft(basePlan({ registrationCount: 5 })), 0);
});

test("access codes ignore case and spaces, and generated codes use the safe alphabet", () => {
  assert.equal(normaliseAccessCode(" ab c-12 "), "ABC-12");
  const code = newAccessCode((max) => max - 1);
  assert.match(code, /^[2-9A-HJ-NP-Z]{8}$/);
});

const form = {
  name: "Pilot monthly",
  description: "",
  basePlan: "6aeb766064f4e9a49fc2e0af",
  duration: "MONTHLY",
  originalPrice: "550",
  discountType: "FIXED",
  discountValue: "180",
  maxRegistrations: "20",
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  status: "ACTIVE",
  eligibilityType: "PUBLIC",
  accessCode: "",
  allowedEmails: "",
  maxPerEmail: "1",
  termsAndConditions: "",
};

test("the admin form is turned into a plan whose price and months are computed on the server", () => {
  const plan = pilotPlanInputSchema.parse({ ...form, offerPrice: "1", durationMonths: "99", registrationCount: "50" });
  assert.equal(plan.offerPrice, 370);
  assert.equal(plan.durationMonths, 1);
  assert.equal(plan.startDate.toISOString(), "2026-05-31T18:30:00.000Z");
  assert.equal("registrationCount" in plan, false);
});

test("rejects bad limits, prices, dates, discounts and incomplete restrictions", () => {
  for (const input of [
    { maxRegistrations: "0" }, { maxRegistrations: "2.5" }, { originalPrice: "0" }, { originalPrice: "12.345" },
    { discountType: "PERCENTAGE", discountValue: "101" }, { discountValue: "550" }, { discountValue: "-1" },
    { endDate: "2026-05-01" }, { startDate: "nope" }, { duration: "CUSTOM" }, { duration: "YEARLY" },
    { eligibilityType: "EMAIL_LIST" }, { eligibilityType: "EMAIL_LIST", allowedEmails: "not-an-email" },
    { eligibilityType: "ACCESS_CODE", accessCode: "ab" }, { status: "FULL" }, { basePlan: "x" },
  ]) {
    assert.equal(pilotPlanInputSchema.safeParse({ ...form, ...input }).success, false, JSON.stringify(input));
  }
  assert.equal(pilotPlanInputSchema.safeParse({ ...form, duration: "CUSTOM", customDuration: "4" }).success, true);
  const list = pilotPlanInputSchema.parse({ ...form, eligibilityType: "EMAIL_LIST", allowedEmails: "A@x.com, a@x.com\nb@x.com" });
  assert.deepEqual(list.allowedEmails, ["a@x.com", "b@x.com"]);
});

test("admins manage pilot plans but cannot delete them; editors have no access", () => {
  assert.equal(can("ADMIN", "create", "pilotPlans"), true);
  assert.equal(can("ADMIN", "update", "pilotPlans"), true);
  assert.equal(can("ADMIN", "delete", "pilotPlans"), false);
  assert.equal(can("EDITOR", "read", "pilotPlans"), false);
  assert.equal(can("SUPER_ADMIN", "read", "pilotPlans"), true);
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
    dataDir = mkdtempSync(path.join(tmpdir(), "mindvines-pilot-"));
    const port = await freePort();
    mongod = spawn("mongod", ["--dbpath", dataDir, "--port", String(port), "--bind_ip", "127.0.0.1", "--quiet"], { stdio: "ignore" });
    mongod.on("error", () => {});
    process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/mindvines_pilot_test`;
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

async function modules() {
  const [{ PilotPlan }, { PilotRegistration }, svc, { Subscription }, { Payment }] = await Promise.all([
    import("../src/models/PilotPlan"),
    import("../src/models/PilotRegistration"),
    import("../src/services/pilot.service"),
    import("../src/models/Subscription"),
    import("../src/models/Payment"),
  ]);
  await PilotPlan.init();
  await PilotRegistration.init();
  return { PilotPlan, PilotRegistration, svc, Subscription, Payment };
}

let counter = 0;
async function makePlan(over: Record<string, unknown> = {}) {
  const { PilotPlan } = await modules();
  counter += 1;
  return PilotPlan.create({
    name: `Pilot ${counter}`,
    basePlan: new Types.ObjectId(),
    duration: "THREE_MONTHS",
    durationMonths: 3,
    originalPrice: 1500,
    discountType: "FIXED",
    discountValue: 501,
    offerPrice: 999,
    maxRegistrations: 5,
    startDate: new Date(Date.now() - 86_400_000),
    endDate: new Date(Date.now() + 86_400_000),
    status: "ACTIVE",
    ...over,
  });
}

const reserve = async (planId: Types.ObjectId, email = `p${Math.random()}@example.com`, extra: Record<string, unknown> = {}) => {
  const { svc } = await modules();
  const registrationId = new Types.ObjectId();
  await svc.reservePilotSlot({ registrationId, pilotPlanId: planId, email, ...extra });
  return registrationId;
};

db("20 families racing for 5 places: exactly 5 get one, the counter never passes the limit", async () => {
  const { PilotPlan, PilotRegistration, svc } = await modules();
  const plan = await makePlan({ maxRegistrations: 5, maxPerEmail: 0 });
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => reserve(plan._id)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 5);
  const refused = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  assert.equal(refused.length, 15);
  assert.ok(refused.every((r) => r.reason instanceof svc.PilotError && /fully booked/i.test(r.reason.message)));
  const fresh = await PilotPlan.findById(plan._id).lean();
  assert.equal(fresh?.reservedCount, 5);
  assert.equal(await PilotRegistration.countDocuments({ pilotPlan: plan._id, status: "RESERVED" }), 5);
  assert.equal(pilotAvailability(fresh!), "FULLY_BOOKED");
});

db("the same registration clicking pay many times at once holds one place only", async () => {
  const { PilotPlan, PilotRegistration, svc } = await modules();
  const plan = await makePlan();
  const registrationId = new Types.ObjectId();
  await Promise.all(Array.from({ length: 8 }, () => svc.reservePilotSlot({ registrationId, pilotPlanId: plan._id, email: "one@example.com" })));
  assert.equal((await PilotPlan.findById(plan._id).lean())?.reservedCount, 1);
  assert.equal(await PilotRegistration.countDocuments({ registration: registrationId }), 1);
});

db("one email can't hold more places than the plan allows", async () => {
  const plan = await makePlan({ maxPerEmail: 1 });
  await reserve(plan._id, "Parent@Example.com");
  await assert.rejects(() => reserve(plan._id, "parent@example.com"), /already registered/);
  await reserve(plan._id, "other@example.com");
});

db("a payment that is abandoned gives its place back, by cancel or by expiry", async () => {
  const { PilotPlan, PilotRegistration, svc } = await modules();
  const plan = await makePlan({ maxRegistrations: 2, maxPerEmail: 0 });
  const first = await reserve(plan._id);
  await reserve(plan._id);
  await assert.rejects(() => reserve(plan._id), /fully booked/i);

  assert.equal(await svc.releasePilotReservation(first, "Payment cancelled"), true);
  assert.equal(await svc.releasePilotReservation(first, "again"), false); // only once
  assert.equal((await PilotPlan.findById(plan._id).lean())?.reservedCount, 1);
  const retaken = await reserve(plan._id);

  // The remaining hold lapses: the next family can take it, and the sweep counts it once.
  await PilotRegistration.updateOne({ registration: retaken }, { $set: { reservedUntil: new Date(Date.now() - 1000) } });
  await reserve(plan._id);
  assert.equal((await PilotPlan.findById(plan._id).lean())?.reservedCount, 2);
  assert.equal((await PilotRegistration.findOne({ registration: retaken }).lean())?.status, "RELEASED");
});

db("a hold whose payment is still being confirmed is not released when it expires", async () => {
  const { PilotRegistration, Subscription, Payment, svc } = await modules();
  const plan = await makePlan({ maxRegistrations: 1, maxPerEmail: 0 });
  const registrationId = await reserve(plan._id);
  const subscription = await Subscription.create({
    plan: new Types.ObjectId(),
    planSnapshot: { name: "x", ageGroup: "6-8", price: 1, durationMonths: 1 },
    registration: { name: "A", email: "a@example.com", phone: "1" },
  });
  await Payment.create({ subscription: subscription._id, plan: new Types.ObjectId(), razorpayOrderId: `o_${Date.now()}`, baseAmount: 1, taxAmount: 0, amount: 1, status: "PENDING" });
  await PilotRegistration.updateOne({ registration: registrationId }, { $set: { subscription: subscription._id, reservedUntil: new Date(Date.now() - 1000) } });
  assert.equal(await svc.releaseExpiredReservations(plan._id), 0);
  assert.equal((await PilotRegistration.findOne({ registration: registrationId }).lean())?.status, "RESERVED");
});

db("confirming a verified payment moves the place from held to taken, once", async () => {
  const { PilotPlan, PilotRegistration, svc } = await modules();
  const plan = await makePlan({ maxRegistrations: 1 });
  const registrationId = await reserve(plan._id, "paid@example.com");
  const subscriptionId = new Types.ObjectId();
  await PilotRegistration.updateOne({ registration: registrationId }, { $set: { subscription: subscriptionId } });
  const dates = { start: new Date(), expiry: new Date(Date.now() + 90 * 86_400_000) };
  assert.equal(await svc.confirmPilotSlot(subscriptionId, { amount: 117882, paymentReference: "order_1" }, dates), true);
  assert.equal(await svc.confirmPilotSlot(subscriptionId, { amount: 117882, paymentReference: "order_1" }, dates), true); // browser and webhook both report it
  const fresh = await PilotPlan.findById(plan._id).lean();
  assert.deepEqual([fresh?.registrationCount, fresh?.reservedCount], [1, 0]);
  const record = await PilotRegistration.findOne({ registration: registrationId }).lean();
  assert.deepEqual([record?.status, record?.paymentStatus, record?.amount], ["CONFIRMED", "PAID", 117882]);
  await assert.rejects(() => reserve(plan._id), /fully booked/i);
});

db("a very late payment takes a free place, or is flagged for refund when the plan has filled", async () => {
  const { PilotPlan, PilotRegistration, svc } = await modules();
  const plan = await makePlan({ maxRegistrations: 1, maxPerEmail: 0 });
  const late = await reserve(plan._id);
  const subscriptionId = new Types.ObjectId();
  await PilotRegistration.updateOne({ registration: late }, { $set: { subscription: subscriptionId } });
  await svc.releasePilotReservation(late, "expired");
  await reserve(plan._id); // someone else takes the freed place
  const dates = { start: new Date(), expiry: new Date() };
  assert.equal(await svc.confirmPilotSlot(subscriptionId, { amount: 100 }, dates), false);
  assert.equal((await PilotRegistration.findOne({ registration: late }).lean())?.status, "REFUND_REQUIRED");
  const fresh = await PilotPlan.findById(plan._id).lean();
  assert.deepEqual([fresh?.registrationCount, fresh?.reservedCount], [0, 1]); // the limit was never exceeded

  const free = await makePlan({ maxRegistrations: 1 });
  const lateButFree = await reserve(free._id);
  const subId = new Types.ObjectId();
  await PilotRegistration.updateOne({ registration: lateButFree }, { $set: { subscription: subId } });
  await svc.releasePilotReservation(lateButFree, "expired");
  assert.equal(await svc.confirmPilotSlot(subId, { amount: 100 }, dates), true);
  assert.equal((await PilotPlan.findById(free._id).lean())?.registrationCount, 1);
});

db("cancelling or refunding a confirmed pilot subscription reopens its place", async () => {
  const { PilotPlan, PilotRegistration, svc } = await modules();
  const plan = await makePlan({ maxRegistrations: 1 });
  const registrationId = await reserve(plan._id);
  const subscriptionId = new Types.ObjectId();
  await PilotRegistration.updateOne({ registration: registrationId }, { $set: { subscription: subscriptionId } });
  await svc.confirmPilotSlot(subscriptionId, { amount: 100 }, { start: new Date(), expiry: new Date() });
  assert.equal(await svc.cancelPilotPlace(subscriptionId, "refunded"), true);
  assert.equal(await svc.cancelPilotPlace(subscriptionId, "refunded"), false); // counted down once
  const fresh = await PilotPlan.findById(plan._id).lean();
  assert.equal(fresh?.registrationCount, 0);
  assert.equal(pilotAvailability(fresh!), "OPEN");
  assert.equal((await PilotRegistration.findOne({ registration: registrationId }).lean())?.paymentStatus, "REFUNDED");
  await reserve(plan._id);
});

db("inactive, ended and not-yet-open plans take no reservations, even through an old link", async () => {
  for (const over of [{ status: "INACTIVE" }, { endDate: new Date(Date.now() - 1000) }, { startDate: new Date(Date.now() + 86_400_000) }]) {
    const plan = await makePlan(over);
    await assert.rejects(() => reserve(plan._id), /not available|closed|not opened|not started/i, JSON.stringify(over));
  }
});

db("restricted plans are never listed, need their code, and email lists are enforced", async () => {
  const { svc } = await modules();
  const open = await makePlan({ name: "Open for all" });
  const coded = await makePlan({ name: "Coded", eligibilityType: "ACCESS_CODE", accessCode: "SECRET99" });
  const listed = await makePlan({ name: "Invited", eligibilityType: "EMAIL_LIST", accessCode: "INVITE77", allowedEmails: ["ok@example.com"] });
  await makePlan({ name: "Hidden", status: "INACTIVE" });
  await makePlan({ name: "Old", endDate: new Date(Date.now() - 1000) });

  const publicPlans = await svc.listPublicPilotPlans();
  const names = publicPlans.map((plan) => plan.name);
  assert.ok(names.includes("Open for all"));
  assert.ok(!["Coded", "Invited", "Hidden", "Old"].some((name) => names.includes(name)));
  assert.ok(publicPlans.every((plan) => !("accessCode" in plan) && !("allowedEmails" in plan)));

  assert.equal((await svc.findPilotPlanByCode("secret99"))?.name, "Coded");
  assert.equal(await svc.findPilotPlanByCode("WRONG123"), null);
  assert.equal(await svc.getPilotPlanForVisitor(coded._id.toString(), "nope"), null);
  assert.ok(await svc.getPilotPlanForVisitor(coded._id.toString(), " secret99 "));
  assert.ok(await svc.getPilotPlanForVisitor(open._id.toString()));

  // Reserving enforces the email list from the server's own record of the registration.
  await assert.rejects(() => reserve(listed._id, "stranger@example.com"), /invited families/);
  await reserve(listed._id, "OK@example.com");
  const plan = await svc.getPilotPlan(coded._id.toString());
  assert.throws(() => svc.assertPilotEligible(plan!, { code: "bad", requireCode: true }), /not available/);
  assert.doesNotThrow(() => svc.assertPilotEligible(plan!, { code: "SECRET99", requireCode: true }));
});

db("the maximum can't be lowered below the places already taken or held", async () => {
  const { svc } = await modules();
  const { SubscriptionPlan } = await import("../src/models/SubscriptionPlan");
  const base = await SubscriptionPlan.create({ name: "Base", description: "d", ageGroup: "6-8", price: 1500, durationMonths: 3, journalCount: 3, status: "PUBLISHED" });
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const input = pilotPlanInputSchema.parse({ ...form, basePlan: base._id.toString(), maxRegistrations: "3", maxPerEmail: "0", startDate: day(-2), endDate: day(5) });
  const plan = await svc.createPilotPlan(input, new Types.ObjectId().toString());
  await reserve(plan._id);
  await reserve(plan._id);
  await assert.rejects(() => svc.updatePilotPlan(plan._id.toString(), { ...input, maxRegistrations: 1 }, new Types.ObjectId().toString()), /can't be lower/);
  const raised = await svc.updatePilotPlan(plan._id.toString(), { ...input, maxRegistrations: 10 }, new Types.ObjectId().toString());
  assert.equal(raised?.maxRegistrations, 10);
  assert.equal(raised?.reservedCount, 2); // an edit never touches the counters
  assert.ok(PILOT_RESERVATION_MS >= 15 * 60 * 1000);
});
