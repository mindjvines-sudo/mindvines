import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyPaymentSignature, verifyWebhookSignature } from "../src/lib/razorpay-signature";
import {
  DAY_MS,
  addMonths,
  computeAmounts,
  deriveState,
  remainingDays,
  stateFilter,
  SUBSCRIPTION_STATES,
} from "../src/lib/subscription-status";
import { ageInYears, registrationDetailsSchema } from "../src/validations/registration.schema";
import { normalisePhone, phoneProblem, postalCodeProblem } from "../src/lib/countries";
import { newRegistrationReference } from "../src/lib/registration-status";
import { activeNavHref } from "../src/config/navigation";
import { contactMatches, normaliseReference, renewalPeriod } from "../src/lib/renewal";
import { TOPIC_PICKS, checkTopicPicks, requiredPicks } from "../src/lib/topics";

const now = new Date("2026-11-04T10:00:00.000Z");
const inDays = (days: number) => new Date(now.getTime() + days * DAY_MS);
const active = (expiryDate: Date) => ({ status: "ACTIVE" as const, expiryDate });

test("remaining days count the last partial day as one, and never go negative", () => {
  assert.equal(remainingDays(inDays(30), now), 30);
  assert.equal(remainingDays(new Date(now.getTime() + 60_000), now), 1);
  assert.equal(remainingDays(now, now), 0);
  assert.equal(remainingDays(inDays(-3), now), 0);
  assert.equal(remainingDays(null, now), 0);
});

test("states follow the expiry date: 30 days active, 7 soon, 1 today, 0 expired", () => {
  assert.equal(deriveState(active(inDays(30)), now), "ACTIVE");
  assert.equal(deriveState(active(inDays(8)), now), "ACTIVE");
  assert.equal(deriveState(active(inDays(7)), now), "EXPIRING_SOON");
  assert.equal(deriveState(active(inDays(2)), now), "EXPIRING_SOON");
  assert.equal(deriveState(active(inDays(1)), now), "EXPIRING_TODAY");
  assert.equal(deriveState(active(inDays(0)), now), "EXPIRED");
  assert.equal(deriveState(active(inDays(-1)), now), "EXPIRED");
});

test("a stored ACTIVE is not trusted once the date has passed, nor a stored EXPIRED once it is renewed", () => {
  assert.equal(deriveState({ status: "ACTIVE", expiryDate: inDays(-1) }, now), "EXPIRED");
  assert.equal(deriveState({ status: "EXPIRED", expiryDate: inDays(-1) }, now), "EXPIRED");
});

test("pending and cancelled subscriptions keep their state whatever the date", () => {
  assert.equal(deriveState({ status: "PENDING_PAYMENT", expiryDate: null }, now), "PENDING_PAYMENT");
  assert.equal(deriveState({ status: "CANCELLED", expiryDate: inDays(30) }, now), "CANCELLED");
});

test("a paid renewal queued behind another is Upcoming until its start date", () => {
  assert.equal(deriveState({ status: "ACTIVE", startDate: inDays(10), expiryDate: inDays(100) }, now), "UPCOMING");
  assert.equal(deriveState({ status: "ACTIVE", startDate: inDays(-1), expiryDate: inDays(100) }, now), "ACTIVE");
  assert.equal(deriveState({ status: "CANCELLED", startDate: inDays(10), expiryDate: inDays(100) }, now), "CANCELLED");
});

test("each state's database filter selects exactly the rows deriveState labels with it", () => {
  const rows = [
    { status: "ACTIVE", expiryDate: inDays(30) },
    { status: "ACTIVE", startDate: inDays(-5), expiryDate: inDays(30) },
    { status: "ACTIVE", startDate: inDays(10), expiryDate: inDays(100) },
    { status: "ACTIVE", expiryDate: inDays(7) },
    { status: "ACTIVE", expiryDate: inDays(1) },
    { status: "ACTIVE", expiryDate: inDays(0.5) },
    { status: "ACTIVE", expiryDate: inDays(-2) },
    { status: "EXPIRED", expiryDate: inDays(-2) },
    { status: "PENDING_PAYMENT", expiryDate: undefined },
    { status: "CANCELLED", expiryDate: inDays(10) },
  ] as const;

  type Condition = Record<string, unknown>;
  const matches = (row: (typeof rows)[number], filter: Condition) =>
    Object.entries(filter).every(([key, condition]) => {
      const value = (row as Record<string, unknown>)[key];
      if (key === "startDate" && (condition as { $not?: unknown }).$not) return !(value instanceof Date && value > now);
      if (key === "status") return typeof condition === "string" ? value === condition : (condition as { $in: string[] }).$in.includes(value as string);
      const range = condition as { $gt?: Date; $lte?: Date };
      if (!(value instanceof Date)) return false;
      return (!range.$gt || value > range.$gt) && (!range.$lte || value <= range.$lte);
    });

  for (const state of SUBSCRIPTION_STATES) {
    const byFilter = rows.filter((row) => matches(row, stateFilter(state, now)));
    const byState = rows.filter((row) => deriveState(row, now) === state);
    assert.deepEqual(byFilter, byState, state);
  }
});

test("months are calendar months, clamped at month end", () => {
  assert.equal(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString(), "2026-02-28T00:00:00.000Z");
  assert.equal(addMonths(new Date("2026-11-04T10:00:00Z"), 12).toISOString(), "2027-11-04T10:00:00.000Z");
  assert.equal(addMonths(new Date("2026-11-30T00:00:00Z"), 3).toISOString(), "2027-02-28T00:00:00.000Z");
});

test("GST is added in whole paise", () => {
  assert.deepEqual(computeAmounts(370, 18), { baseAmount: 37000, taxAmount: 6660, totalAmount: 43660 });
  assert.deepEqual(computeAmounts(3240, 18), { baseAmount: 324000, taxAmount: 58320, totalAmount: 382320 });
  assert.deepEqual(computeAmounts(0.1 + 0.2, 18), { baseAmount: 30, taxAmount: 5, totalAmount: 35 });
  assert.equal(computeAmounts(100, 0).totalAmount, 10000);
});

test("checkout signatures: only Razorpay's own HMAC passes", () => {
  const secret = "test_secret";
  const good = createHmac("sha256", secret).update("order_A|pay_B").digest("hex");
  assert.equal(verifyPaymentSignature({ orderId: "order_A", paymentId: "pay_B", signature: good, secret }), true);
  assert.equal(verifyPaymentSignature({ orderId: "order_A", paymentId: "pay_X", signature: good, secret }), false);
  assert.equal(verifyPaymentSignature({ orderId: "order_A", paymentId: "pay_B", signature: good, secret: "other" }), false);
  assert.equal(verifyPaymentSignature({ orderId: "order_A", paymentId: "pay_B", signature: "", secret }), false);
  assert.equal(verifyPaymentSignature({ orderId: "order_A", paymentId: "pay_B", signature: good.slice(2), secret }), false);
});

test("webhook signatures cover the exact raw body", () => {
  const secret = "whsec";
  const rawBody = '{"event":"payment.captured"}';
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  assert.equal(verifyWebhookSignature({ rawBody, signature, secret }), true);
  assert.equal(verifyWebhookSignature({ rawBody: rawBody + " ", signature, secret }), false);
  assert.equal(verifyWebhookSignature({ rawBody, signature, secret: "x" }), false);
});

const page1 = {
  childName: "Aarav",
  childDob: "2017-05-14",
  school: "Green Valley School",
  parentName: "Asha Rao",
  countryCode: "IN",
  addressLine1: "12 MG Road, Indiranagar",
  addressLine2: "",
  city: "Bengaluru",
  postalCode: "560038",
  phoneCountry: "IN",
  phone: "9876543210",
  email: "  Asha@Example.COM ",
  acceptTerms: true,
  allowFeature: false,
  whatsappUpdates: true,
};

test("page 1 accepts Indian mobile formats with or without the country code, and rejects the rest", () => {
  for (const phone of ["9876543210", "+91 98765 43210", "09876543210", "98765-43210", "919876543210"]) {
    const parsed = registrationDetailsSchema.parse({ ...page1, phone });
    assert.equal(parsed.phone, "9876543210", phone);
    assert.equal(parsed.email, "asha@example.com");
  }
  for (const phone of ["12345", "5876543210", "98765432101", "abcdefghij", ""]) {
    assert.equal(registrationDetailsSchema.safeParse({ ...page1, phone }).success, false, phone);
  }
  // Other countries take their own numbers.
  assert.equal(registrationDetailsSchema.parse({ ...page1, phoneCountry: "GB", phone: "07700 900123" }).phone, "7700900123");
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, phoneCountry: "ZZ" }).success, false);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, email: "nope" }).success, false);
});

test("page 1 needs the terms, a real birthday, a known country and a postal code that fits it", () => {
  assert.equal(registrationDetailsSchema.safeParse(page1).success, true);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, acceptTerms: false }).success, false);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, childDob: "2017-02-30" }).success, false);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, childDob: "2099-01-01" }).success, false);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, postalCode: "5600" }).success, false);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, countryCode: "GB", postalCode: "SW1A 1AA" }).success, true);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, countryCode: "US", postalCode: "10001-1234" }).success, true);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, countryCode: "US", postalCode: "SW1A" }).success, false);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, countryCode: "XX" }).success, false);
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, school: "" }).success, false);
  // Only the terms are required; the two optional permissions can be left unticked.
  assert.equal(registrationDetailsSchema.safeParse({ ...page1, allowFeature: false, whatsappUpdates: false }).success, true);
});

test("postal and phone rules by country", () => {
  assert.equal(postalCodeProblem("IN", "560038"), null);
  assert.match(postalCodeProblem("IN", "56003") ?? "", /6-digit PIN/);
  assert.equal(postalCodeProblem("CA", "K1A 0B1"), null);
  assert.equal(postalCodeProblem("FR", "75001"), null);
  assert.equal(phoneProblem("IN", "9876543210"), null);
  assert.match(phoneProblem("IN", "1234567890") ?? "", /10-digit/);
  assert.equal(phoneProblem("US", "2025550123"), null);
  assert.equal(normalisePhone("IN", "+91 98765 43210"), "9876543210");
});

test("a child's age counts whole years up to their birthday", () => {
  const on = new Date(2026, 4, 13);
  assert.equal(ageInYears("2017-05-14", on), 8);
  assert.equal(ageInYears("2017-05-13", on), 9);
});

test("topic picks: exactly the number asked, from the list, no repeats", () => {
  const ids = Array.from({ length: 18 }, (_, i) => `t${i}`);
  assert.equal(requiredPicks(18), TOPIC_PICKS);
  assert.equal(requiredPicks(4), 4);
  assert.equal(requiredPicks(18, 5), 5);
  assert.equal(checkTopicPicks(ids.slice(0, 10), ids), null);
  assert.match(checkTopicPicks(ids.slice(0, 9), ids) ?? "", /Pick 10 topics \(9 chosen\)/);
  assert.match(checkTopicPicks(ids.slice(0, 11), ids) ?? "", /Pick 10 topics \(11 chosen\)/);
  assert.match(checkTopicPicks([...ids.slice(0, 9), "gone"], ids) ?? "", /no longer available/);
  assert.match(checkTopicPicks([...ids.slice(0, 9), "t0"], ids) ?? "", /only be picked once/);
  assert.equal(checkTopicPicks(ids.slice(0, 4), ids.slice(0, 4)), null);
  assert.equal(checkTopicPicks(ids.slice(0, 3), ids, 3), null);
});

test("registration references are short, readable and unambiguous", () => {
  let n = 0;
  const reference = newRegistrationReference(() => n++ % 32);
  assert.match(reference, /^MV-[2-9A-HJ-NP-Z]{6}$/);
  assert.match(newRegistrationReference((max) => max - 1), /^MV-Z{6}$/);
});

test("the sidebar highlights the entry that matches the address most closely", () => {
  const items = [
    { href: "/admin/subscribers" },
    { href: "/admin/subscribers?state=ACTIVE" },
    { href: "/admin/subscribers?state=EXPIRED" },
    { href: "/admin/topics" },
  ];
  assert.equal(activeNavHref(items, "/admin/subscribers", new URLSearchParams("")), "/admin/subscribers");
  assert.equal(activeNavHref(items, "/admin/subscribers", new URLSearchParams("state=ACTIVE&search=x")), "/admin/subscribers?state=ACTIVE");
  assert.equal(activeNavHref(items, "/admin/subscribers", new URLSearchParams("state=CANCELLED")), "/admin/subscribers");
  assert.equal(activeNavHref(items, "/admin/subscribers/abc", new URLSearchParams("tab=payments")), "/admin/subscribers");
  assert.equal(activeNavHref(items, "/admin/topics/categories", new URLSearchParams("")), "/admin/topics");
  assert.equal(activeNavHref(items, "/admin/blog", new URLSearchParams("")), null);
});

test("registration numbers are read however parents type them", () => {
  for (const typed of ["MV-5KWHQD", "mv-5kwhqd", " MV 5KWHQD ", "5KWHQD", "mv5kwhqd"]) assert.equal(normaliseReference(typed), "MV-5KWHQD", typed);
  assert.equal(normaliseReference("  "), "");
});

test("renewing needs the email or mobile number the registration was made with", () => {
  const registered = { email: "asha@example.com", phone: "9876543210", phoneDial: "91" };
  for (const typed of ["asha@example.com", " ASHA@Example.com ", "9876543210", "+91 98765 43210", "09876543210", "919876543210"]) {
    assert.equal(contactMatches(typed, registered), true, typed);
  }
  for (const typed of ["someone@example.com", "9876543211", "43210", "", "asha@example"]) {
    assert.equal(contactMatches(typed, registered), false, typed);
  }
});

test("a renewal starts when the current subscription ends, or today once it has ended", () => {
  const now = new Date("2026-11-06T10:00:00.000Z");
  const running = new Date("2026-12-01T00:00:00.000Z");
  const early = renewalPeriod(running, 3, now);
  assert.equal(early.start.toISOString(), running.toISOString());
  assert.equal(early.end.toISOString(), "2027-03-01T00:00:00.000Z");
  const lapsed = renewalPeriod(new Date("2026-10-01T00:00:00.000Z"), 1, now);
  assert.equal(lapsed.start.toISOString(), now.toISOString());
  assert.equal(renewalPeriod(null, 12, now).start.toISOString(), now.toISOString());
});
