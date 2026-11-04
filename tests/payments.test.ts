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
import { checkoutDetailsSchema } from "../src/validations/checkout.schema";

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

test("each state's database filter selects exactly the rows deriveState labels with it", () => {
  const rows = [
    { status: "ACTIVE", expiryDate: inDays(30) },
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
      const value = row[key as "status" | "expiryDate"];
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

test("checkout details accept Indian mobile formats and reject the rest", () => {
  const base = { name: "Asha Rao", email: "  Asha@Example.COM ", childName: "Aarav", childAge: "7" };
  for (const phone of ["9876543210", "+91 98765 43210", "09876543210", "98765-43210"]) {
    const parsed = checkoutDetailsSchema.parse({ ...base, phone });
    assert.equal(parsed.phone, "9876543210", phone);
    assert.equal(parsed.email, "asha@example.com");
  }
  for (const phone of ["12345", "5876543210", "98765432101", "abcdefghij", ""]) {
    assert.equal(checkoutDetailsSchema.safeParse({ ...base, phone }).success, false, phone);
  }
  assert.equal(checkoutDetailsSchema.safeParse({ ...base, phone: "9876543210", childAge: "seven" }).success, false);
  assert.equal(checkoutDetailsSchema.safeParse({ ...base, phone: "9876543210", email: "nope" }).success, false);
});
