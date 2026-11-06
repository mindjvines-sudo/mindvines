import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { DEFAULT_SUBSCRIBER_NOTIFICATION_EMAIL } from "../src/config/email";
import { subscriptionAdminAlertEmail } from "../src/lib/email-templates";
import { Payment } from "../src/models/Payment";
import { SiteSettings } from "../src/models/SiteSettings";
import { Subscriber } from "../src/models/Subscriber";
import { Subscription } from "../src/models/Subscription";
import { settlePayment } from "../src/services/checkout.service";
import { getSubscriberNotificationEmail, updateSiteSettings } from "../src/services/settings.service";
import { settingsInputSchema } from "../src/validations/settings.schema";

function database(context: TestContext) {
  const cache = global.__mongooseCache!;
  const previous = cache.conn;
  cache.conn = mongoose;
  context.after(() => { cache.conn = previous; });
}

test("notification settings validate addresses and allow clearing the recipient", () => {
  const parse = (subscriberNotificationEmail?: string) => settingsInputSchema.safeParse({ siteName: "Mindvines", subscriberNotificationEmail });
  const valid = parse(" Staff@Example.com ");
  assert.ok(valid.success);
  assert.equal(valid.data.subscriberNotificationEmail, "staff@example.com");
  for (const value of [undefined, "", "  "]) assert.equal(parse(value).success, true);
  for (const value of ["invalid", "a@example.com,b@example.com", "a@example.com\r\nBcc: x@example.com"]) assert.equal(parse(value).success, false);
});

test("missing and blank settings use the default; clearing a saved inbox restores it", async (context) => {
  database(context);
  let settings: { subscriberNotificationEmail?: string } | null = null;
  context.mock.method(SiteSettings, "findOne", () => ({ select: () => ({ lean: async () => settings }) }));
  context.mock.method(SiteSettings, "findOneAndUpdate", async (_filter: unknown, update: { subscriberNotificationEmail?: string }) => { settings = update; });
  assert.equal(await getSubscriberNotificationEmail(), DEFAULT_SUBSCRIBER_NOTIFICATION_EMAIL);
  for (const value of [undefined, "", "   ", "staff@example.com"]) {
    settings = { subscriberNotificationEmail: value };
    assert.equal(await getSubscriberNotificationEmail(), value?.trim() || DEFAULT_SUBSCRIBER_NOTIFICATION_EMAIL);
  }
  await updateSiteSettings(settingsInputSchema.parse({ siteName: "Mindvines", subscriberNotificationEmail: "" }), "admin-id");
  assert.equal(await getSubscriberNotificationEmail(), "mindjvines@gmail.com");
});

type Mail = { to: string[]; replyTo: string; subject: string; text: string; html: string };

function checkoutFixture(context: TestContext, options: { recipient?: string; failTo?: string; renewal?: boolean } = {}) {
  database(context);
  const savedEnv = { ...process.env };
  Object.assign(process.env, { SMTP_HOST: "smtp.example.com", EMAIL_FROM: "sender@example.com" });
  context.after(() => { process.env = savedEnv; });
  context.mock.method(console, "error", () => {});
  const mails: Mail[] = [];
  context.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async (mail: Mail) => {
      mails.push(mail);
      if (mail.to.includes(options.failTo ?? "")) throw new Error("SMTP delivery failed");
      return { messageId: `message-${mails.length}` };
    },
  }));
  // A different transport key per fixture prevents reuse of a previous mock.
  process.env.SMTP_USER = context.name;
  const id = new mongoose.Types.ObjectId();
  const subscription = {
    _id: id, status: "PENDING_PAYMENT", reference: "MV-ABC123", renewal: options.renewal ?? false,
    registration: { name: "Priya Nair", email: "parent@example.com", phone: "+91 9876543210", childName: "Asha" },
    planSnapshot: { name: "Writing", programme: "Creative writing", ageGroup: "9-12", durationMonths: 3 },
    confirmationEmailSentAt: undefined as Date | undefined,
    adminNotificationEmailSentAt: undefined as Date | undefined,
  };
  const payment = { _id: new mongoose.Types.ObjectId(), subscription: id, status: "PAID", amount: 106200, taxAmount: 16200, currency: "INR", razorpayPaymentId: "pay_123" };
  // Query stubs support both awaited documents and lean reads in the real settlement path.
  const query = <T,>(value: T) => Object.assign(Promise.resolve(value), { lean: async () => ({ ...value }) });
  context.mock.method(Payment, "findOne", () => query(payment));
  context.mock.method(Payment, "findById", () => query(payment));
  context.mock.method(Payment, "updateOne", async () => ({}));
  context.mock.method(Subscriber, "findOneAndUpdate", async () => ({ _id: new mongoose.Types.ObjectId() }));
  context.mock.method(Subscription, "findById", () => query({ ...subscription }));
  context.mock.method(Subscription, "findOne", () => ({ sort: async () => null }));
  context.mock.method(Subscription, "findOneAndUpdate", async (_filter: unknown, update: { $set: Record<string, unknown> }) => {
    if (subscription.status !== "PENDING_PAYMENT") return null;
    const previous = { ...subscription };
    Object.assign(subscription, update.$set);
    return previous;
  });
  context.mock.method(Subscription, "updateOne", async (_filter: unknown, update: { $set: Record<string, unknown> }) => { Object.assign(subscription, update.$set); });
  context.mock.method(SiteSettings, "findOne", () => ({ select: () => ({ lean: async () => ({ subscriberNotificationEmail: options.recipient }) }) }));
  const settle = (status: "captured" | "authorized" = "captured", amount = payment.amount) => settlePayment({
    orderId: "order_123", razorpayPayment: { id: "pay_123", order_id: "order_123", status, amount, currency: "INR" },
    via: "WEBHOOK", signatureVerified: true,
  });
  return { mails, subscription, settle };
}

test("confirmed payment emails parent and configured admin once across concurrent callbacks", async (context) => {
  const fixture = checkoutFixture(context, { recipient: "staff@example.com" });
  assert.deepEqual(await Promise.all([fixture.settle(), fixture.settle()]), ["paid", "paid"]);
  await fixture.settle();
  assert.equal(fixture.mails.length, 2);
  const admin = fixture.mails.find((mail) => mail.to.includes("staff@example.com"))!;
  assert.match(admin.subject, /New subscriber: Asha/);
  assert.match(admin.text, /Amount paid: ₹1,062/);
  assert.ok(admin.html.includes(`/admin/subscribers/${fixture.subscription._id}`));
  assert.equal(admin.replyTo, "parent@example.com");
  assert.ok(fixture.subscription.adminNotificationEmailSentAt instanceof Date);
  assert.ok(fixture.subscription.confirmationEmailSentAt instanceof Date);
});

test("renewal alerts use the default inbox when the setting is blank", async (context) => {
  const fixture = checkoutFixture(context, { recipient: "", renewal: true });
  assert.equal(await fixture.settle(), "paid");
  assert.ok(fixture.mails.some((mail) => mail.to.includes("mindjvines@gmail.com") && mail.subject.startsWith("Subscription renewed:")));
});

test("uncaptured and mismatched payments do not send subscriber alerts", async (context) => {
  const fixture = checkoutFixture(context);
  assert.equal(await fixture.settle("authorized"), "pending");
  assert.equal(await fixture.settle("captured", 1), "mismatch");
  assert.equal(fixture.mails.length, 0);
});

test("parent delivery failure does not suppress the admin alert or undo payment", async (context) => {
  const fixture = checkoutFixture(context, { failTo: "parent@example.com" });
  assert.equal(await fixture.settle(), "paid");
  assert.equal(fixture.mails.length, 2);
  assert.ok(fixture.subscription.adminNotificationEmailSentAt instanceof Date);
  assert.equal(fixture.subscription.confirmationEmailSentAt, undefined);
});

test("admin delivery failure does not suppress parent confirmation or undo payment", async (context) => {
  const fixture = checkoutFixture(context, { failTo: "mindjvines@gmail.com" });
  assert.equal(await fixture.settle(), "paid");
  assert.equal(fixture.mails.length, 2);
  assert.equal(fixture.subscription.adminNotificationEmailSentAt, undefined);
  assert.ok(fixture.subscription.confirmationEmailSentAt instanceof Date);
});

test("admin alert escapes subscriber details and identifies upcoming renewals", () => {
  const email = subscriptionAdminAlertEmail({
    site: { name: "Mindvines", url: "https://example.com" }, parentName: "Priya <script>", childName: "Asha <b>",
    parentEmail: "parent@example.com", parentPhone: "1234567890", reference: "MV-ABC123", renewal: true,
    programme: "Writing", planName: "Writing", ageGroup: "9-12", durationMonths: 3,
    startDate: "2026-12-01", expiryDate: "2027-03-01", amountPaise: 106200, taxPaise: 16200,
    queued: true, adminUrl: "https://example.com/admin/subscribers/123",
  });
  assert.ok(!email.html.includes("<script>") && !email.html.includes("Asha <b>"));
  assert.match(email.message, /Status: Upcoming/);
  assert.match(email.html, /notification email configured in Admin Settings/);
});
