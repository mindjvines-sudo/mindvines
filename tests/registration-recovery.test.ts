import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { registrationRecoveryEmail } from "../src/lib/email-templates";
import { Programme } from "../src/models/Programme";
import { Registration } from "../src/models/Registration";
import { RegistrationRecovery } from "../src/models/RegistrationRecovery";
import { RecoveryRateLimit } from "../src/models/RecoveryRateLimit";
import { Subscription } from "../src/models/Subscription";
import { SubscriptionPlan } from "../src/models/SubscriptionPlan";
import { RECOVERY_REQUEST_MESSAGE, RecoveryError, requestRegistrationRecovery, selectRecoveredRegistration, verifyRegistrationRecovery } from "../src/services/registration-recovery.service";
import { recoveryRequestSchema, recoverySelectSchema, recoveryVerifySchema } from "../src/validations/registration-recovery.schema";
import { POST as verifyRoute } from "../src/app/api/renewals/recovery/verify/route";
import { POST as selectRoute } from "../src/app/api/renewals/recovery/select/route";

type Doc = Record<string, unknown>;
type Update = { $set?: Doc; $inc?: Record<string, number>; $unset?: Doc; $setOnInsert?: Doc };

function field(doc: Doc, key: string): unknown {
  return key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Doc)[part] : undefined, doc);
}

// Simulates Mongo's conditional writes so races exercise the production filters.
function matches(doc: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return (condition as Doc[]).some((clause) => matches(doc, clause));
    const value = field(doc, key);
    if (condition === null) return value == null;
    if (typeof condition !== "object" || condition instanceof mongoose.Types.ObjectId) return String(value) === String(condition);
    return Object.entries(condition as Doc).every(([op, expected]) => {
      const left = value instanceof Date ? value.getTime() : value as number;
      const right = expected instanceof Date ? expected.getTime() : expected as number;
      if (op === "$exists") return (value !== undefined) === expected;
      if (op === "$lt") return left < right;
      if (op === "$lte") return left <= right;
      if (op === "$gt") return left > right;
      if (op === "$ne") return value != null && String(value) !== String(expected);
      if (op === "$in") return (expected as unknown[]).some((item) => String(item) === String(value));
      throw new Error(`Unsupported fixture operator ${op}`);
    });
  });
}

function update(doc: Doc, changes: Update, inserted = false) {
  if (inserted) Object.assign(doc, changes.$setOnInsert);
  Object.assign(doc, changes.$set);
  for (const [key, amount] of Object.entries(changes.$inc ?? {})) doc[key] = Number(doc[key] ?? 0) + amount;
  for (const key of Object.keys(changes.$unset ?? {})) delete doc[key];
}

function query<T>(value: T) {
  return Object.assign(Promise.resolve(value), {
    select: () => query(value), sort: () => query(value), lean: async () => value,
  });
}

function fixture(context: TestContext, failMail = false) {
  const cache = global.__mongooseCache!;
  const previousConnection = cache.conn;
  const previousEnv = { ...process.env };
  cache.conn = mongoose;
  Object.assign(process.env, { SMTP_HOST: "smtp.example.com", EMAIL_FROM: "sender@example.com", SMTP_USER: context.name, SESSION_SECRET: "recovery-tests-only-01234567890123456789" });
  context.after(() => { cache.conn = previousConnection; process.env = previousEnv; });
  context.mock.method(console, "error", () => {});
  const messages: { to: string[]; text: string; html: string }[] = [];
  context.mock.method(nodemailer, "createTransport", () => ({ sendMail: async (message: typeof messages[number]) => {
    messages.push(message);
    if (failMail) throw new Error("SMTP failed");
    return { messageId: "test-message" };
  } }));
  const challenges = new Map<string, Doc>();
  const buckets = new Map<string, Doc>();
  context.mock.method(RecoveryRateLimit, "findOneAndUpdate", (filter: Doc, changes: Update) => {
    const id = String(filter._id);
    const inserted = !buckets.has(id);
    const doc = buckets.get(id) ?? { _id: id };
    update(doc, changes, inserted);
    buckets.set(id, doc);
    return query({ ...doc });
  });
  context.mock.method(RegistrationRecovery, "findOneAndUpdate", (filter: Doc, changes: Update, options: { upsert?: boolean } = {}) => {
    let doc = [...challenges.values()].find((item) => matches(item, filter));
    if (!doc && options.upsert) {
      const id = String(filter._id);
      if (challenges.has(id)) throw Object.assign(new Error("duplicate"), { code: 11000 });
      doc = { _id: id };
      challenges.set(id, doc);
    }
    if (!doc) return query(null);
    update(doc, changes);
    return query({ ...doc });
  });
  context.mock.method(RegistrationRecovery, "exists", (filter: Doc) => query([...challenges.values()].find((doc) => matches(doc, filter)) ?? null));
  context.mock.method(RegistrationRecovery, "updateOne", (filter: Doc, changes: Update) => {
    const doc = [...challenges.values()].find((item) => matches(item, filter));
    if (doc) update(doc, changes);
    return query({ modifiedCount: doc ? 1 : 0 });
  });
  context.mock.method(RegistrationRecovery, "findOne", (filter: Doc) => query([...challenges.values()].find((doc) => matches(doc, filter)) ?? null));
  const makeRegistration = (reference: string, email: string, status = "COMPLETED") => ({
    _id: new mongoose.Types.ObjectId(), reference, status,
    child: { name: `Child ${reference}`, dob: "2017-05-14", school: "Private school" },
    parent: { email, name: "Parent", phone: "9876543210", phoneDial: "91" },
    address: { line1: "Private address" }, programmeName: "Writing",
  });
  const registrations = [
    makeRegistration("MV-FIRST1", "parent@example.com"), makeRegistration("MV-SECOND", "parent@example.com"),
    makeRegistration("MV-DRAFT1", "parent@example.com", "DRAFT"), makeRegistration("MV-OTHER1", "other@example.com"),
  ];
  const subscriptions = [
    { _id: new mongoose.Types.ObjectId(), registrationId: registrations[0]._id, status: "ACTIVE", startDate: new Date(Date.now() - 86_400_000), expiryDate: new Date(Date.now() + 30 * 86_400_000), plan: new mongoose.Types.ObjectId(), planSnapshot: { name: "Writing · 3 months", programme: "Writing", ageGroup: "9-12", durationMonths: 3 } },
    { _id: new mongoose.Types.ObjectId(), registrationId: registrations[1]._id, status: "EXPIRED", startDate: new Date(Date.now() - 100 * 86_400_000), expiryDate: new Date(Date.now() - 10 * 86_400_000), plan: new mongoose.Types.ObjectId(), planSnapshot: { name: "Writing · 3 months", programme: "Writing", ageGroup: "9-12", durationMonths: 3 } },
  ];
  context.mock.method(Registration, "exists", (filter: Doc) => query(registrations.find((doc) => matches(doc, filter)) ?? null));
  context.mock.method(Registration, "find", (filter: Doc) => query(registrations.filter((doc) => matches(doc, filter))));
  context.mock.method(Registration, "findOne", (filter: Doc) => query(registrations.find((doc) => matches(doc, filter)) ?? null));
  context.mock.method(Registration, "updateOne", (filter: Doc, changes: Update) => {
    const doc = registrations.find((item) => matches(item, filter));
    if (doc) update(doc, changes);
    return query({ modifiedCount: doc ? 1 : 0 });
  });
  context.mock.method(Subscription, "find", (filter: Doc) => query(subscriptions.filter((doc) => matches(doc, filter))));
  context.mock.method(SubscriptionPlan, "findById", () => query(null));
  context.mock.method(SubscriptionPlan, "find", () => query([]));
  context.mock.method(Programme, "find", () => query([]));
  const code = () => messages.at(-1)!.text.match(/Verification code: (\d{6})/)![1];
  const wrong = () => ((Number(code()) + 1) % 1_000_000).toString().padStart(6, "0");
  const current = () => [...challenges.values()].find((item) => item.email === "parent@example.com")!;
  async function delivered() {
    const request = await requestRegistrationRecovery(" Parent@Example.com ", "test-ip");
    await request.deliver();
    return request;
  }
  return { messages, challenges, buckets, registrations, subscriptions, code, wrong, current, delivered };
}

const isError = (code: string) => (error: unknown) => error instanceof RecoveryError && error.code === code;

test("recovery inputs normalise email, preserve leading zeros and reject malformed credentials", () => {
  assert.equal(recoveryRequestSchema.parse({ email: " Parent@Example.COM " }).email, "parent@example.com");
  assert.equal(recoveryRequestSchema.safeParse({ email: "a@example.com\r\nBcc: b@example.com" }).success, false);
  assert.equal(recoveryVerifySchema.parse({ challengeId: "a".repeat(32), code: "001234" }).code, "001234");
  for (const code of ["12345", "1234567", "abcdef"]) assert.equal(recoveryVerifySchema.safeParse({ challengeId: "a".repeat(32), code }).success, false);
  assert.equal(recoverySelectSchema.safeParse({ challengeId: "a".repeat(32), accessToken: "a".repeat(43), registrationId: "invalid" }).success, false);
});

test("known and unknown emails receive the same generic response before delivery", async (context) => {
  const f = fixture(context);
  const known = await requestRegistrationRecovery("parent@example.com", "test-ip");
  const unknown = await requestRegistrationRecovery("unknown@example.com", "test-ip");
  assert.equal(f.messages.length, 0);
  assert.equal(known.message, RECOVERY_REQUEST_MESSAGE);
  assert.equal(unknown.message, known.message);
  assert.equal(known.resendAfter, unknown.resendAfter);
  assert.match(known.challengeId, /^[A-Za-z0-9_-]{32}$/);
  await known.deliver();
  await unknown.deliver();
  assert.equal(f.messages.length, 1);
  assert.deepEqual(f.messages[0].to, ["parent@example.com"]);
  assert.ok(!JSON.stringify(f.current()).includes(f.code()));
  assert.ok(!f.messages[0].html.includes("MV-FIRST1"));
});

test("only completed registrations for the verified inbox are listed, with minimal details", async (context) => {
  const f = fixture(context);
  const request = await f.delivered();
  const result = await verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() });
  assert.deepEqual(result.registrations.map((item) => item.reference), ["MV-FIRST1", "MV-SECOND"]);
  assert.deepEqual(result.registrations.map((item) => item.state), ["ACTIVE", "EXPIRED"]);
  assert.match(result.accessToken, /^[A-Za-z0-9_-]{43}$/);
  const publicData = JSON.stringify(result.registrations);
  for (const secret of ["Private school", "Private address", "2017-05-14", "9876543210", "MV-OTHER1", "MV-DRAFT1"]) assert.ok(!publicData.includes(secret));
  assert.notEqual(f.current().accessTokenHash, result.accessToken);
});

test("five incorrect guesses lock the challenge even when the next code is correct", async (context) => {
  const f = fixture(context);
  const request = await f.delivered();
  for (let attempt = 0; attempt < 5; attempt++) await assert.rejects(verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.wrong() }), isError("INVALID_CODE"));
  await assert.rejects(verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() }), isError("INVALID_CODE"));
  assert.equal(f.current().attempts, 5);
});

test("the fifth attempt may succeed, and the same code cannot be replayed", async (context) => {
  const f = fixture(context);
  const request = await f.delivered();
  for (let attempt = 0; attempt < 4; attempt++) await assert.rejects(verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.wrong() }), isError("INVALID_CODE"));
  assert.equal((await verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() })).registrations.length, 2);
  await assert.rejects(verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() }), isError("INVALID_CODE"));
});

test("parallel valid verifications consume the code once", async (context) => {
  const f = fixture(context);
  const request = await f.delivered();
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() })));
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(f.current().attempts, 5);
});

test("expired codes fail without relying on Mongo TTL cleanup", async (context) => {
  const f = fixture(context);
  const request = await f.delivered();
  f.current().expiresAt = new Date(Date.now() - 1);
  await assert.rejects(verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() }), isError("INVALID_CODE"));
});

test("resending enforces cooldown and invalidates the previous challenge", async (context) => {
  const f = fixture(context);
  const original = await f.delivered();
  const originalCode = f.code();
  await assert.rejects(requestRegistrationRecovery("parent@example.com", "test-ip"), isError("RATE_LIMITED"));
  f.current().lastRequestedAt = new Date(Date.now() - 61_000);
  const next = await requestRegistrationRecovery("parent@example.com", "test-ip");
  await next.deliver();
  assert.notEqual(original.challengeId, next.challengeId);
  await assert.rejects(verifyRegistrationRecovery({ challengeId: original.challengeId, code: originalCode }), isError("INVALID_CODE"));
  assert.equal((await verifyRegistrationRecovery({ challengeId: next.challengeId, code: f.code() })).registrations.length, 2);
});

test("concurrent resend requests issue only one current challenge", async (context) => {
  fixture(context);
  const results = await Promise.allSettled([requestRegistrationRecovery("parent@example.com", "test-ip"), requestRegistrationRecovery("parent@example.com", "test-ip")]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
});

test("per-email hourly request limits are shared and survive challenge replacement", async (context) => {
  const f = fixture(context);
  for (let i = 0; i < 5; i++) {
    if (i > 0) f.current().lastRequestedAt = new Date(Date.now() - 61_000);
    await requestRegistrationRecovery("parent@example.com", `ip-${i}`);
  }
  f.current().lastRequestedAt = new Date(Date.now() - 61_000);
  await assert.rejects(requestRegistrationRecovery("parent@example.com", "another-ip"), isError("RATE_LIMITED"));
});

test("per-IP limits also apply to requests for unknown emails", async (context) => {
  fixture(context);
  for (let i = 0; i < 20; i++) await requestRegistrationRecovery(`unknown-${i}@example.com`, "same-ip");
  await assert.rejects(requestRegistrationRecovery("another@example.com", "same-ip"), isError("RATE_LIMITED"));
});

test("failed delivery never makes a code usable", async (context) => {
  const f = fixture(context, true);
  const request = await f.delivered();
  assert.equal(f.current().deliveredAt, undefined);
  await assert.rejects(verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() }), isError("INVALID_CODE"));
});

test("verified parents can continue renewal, but cannot select another parent's registration", async (context) => {
  const f = fixture(context);
  const request = await f.delivered();
  const verified = await verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() });
  const credentials = { challengeId: request.challengeId, accessToken: verified.accessToken };
  await assert.rejects(selectRecoveredRegistration({ ...credentials, registrationId: f.registrations[3]._id.toString() }), isError("ACCESS_EXPIRED"));
  await assert.rejects(selectRecoveredRegistration({ ...credentials, registrationId: f.registrations[2]._id.toString() }), isError("ACCESS_EXPIRED"));
  const options = await selectRecoveredRegistration({ ...credentials, registrationId: f.registrations[0]._id.toString() });
  assert.equal(options.reference, "MV-FIRST1");
  assert.equal(options.registrationId, f.registrations[0]._id.toString());
  assert.match(options.token, /^[A-Za-z0-9_-]{32}$/);
});

test("wrong and expired access tokens cannot select a registration", async (context) => {
  const f = fixture(context);
  const request = await f.delivered();
  const verified = await verifyRegistrationRecovery({ challengeId: request.challengeId, code: f.code() });
  const input = { challengeId: request.challengeId, accessToken: verified.accessToken, registrationId: f.registrations[0]._id.toString() };
  await assert.rejects(selectRecoveredRegistration({ ...input, accessToken: "x".repeat(43) }), isError("ACCESS_EXPIRED"));
  f.current().accessExpiresAt = new Date(Date.now() - 1);
  await assert.rejects(selectRecoveredRegistration(input), isError("ACCESS_EXPIRED"));
});

test("API rejects malformed requests and prevents caching recovery responses", async () => {
  const request = (body: unknown) => new Request("https://example.com/api/renewals/recovery/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  for (const response of [await verifyRoute(request({ code: "123" })), await selectRoute(request({ accessToken: "bad" }))]) {
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store, private");
    assert.ok(!JSON.stringify(await response.json()).includes("registrations"));
  }
});

test("OTP email is single-use, time-limited, and contains no registration details", () => {
  const email = registrationRecoveryEmail({ site: { name: "Mindvines", url: "https://example.com" }, code: "001234", expiresInMinutes: 10 });
  assert.match(email.message, /Verification code: 001234/);
  assert.match(email.message, /expires in 10 minutes/);
  assert.match(email.message, /used once/);
  assert.match(email.html, /registration recovery request/);
  assert.ok(!email.subject.includes("001234"));
});
