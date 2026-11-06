import assert from "node:assert/strict";
import test from "node:test";
import { escapeHtml, fillTemplate, messageToHtml, parseRecipients, singleLine } from "../src/lib/email-content";

test("recipients: valid addresses are normalised and de-duplicated, anything invalid rejects the lot", () => {
  assert.deepEqual(parseRecipients(" Parent@Example.com "), ["parent@example.com"]);
  assert.deepEqual(parseRecipients(["a@x.com", "A@x.com", "b@x.com"]), ["a@x.com", "b@x.com"]);
  assert.equal(parseRecipients(["a@x.com", "not-an-email"]), null);
  assert.equal(parseRecipients(""), null);
  assert.equal(parseRecipients(undefined), null);
});

test("header text stays on one line", () => {
  assert.equal(singleLine("Hello\r\nBcc: attacker@evil.com"), "Hello Bcc: attacker@evil.com");
});

test("placeholders are filled and unknown ones left empty", () => {
  assert.equal(fillTemplate("Hi {{ name }}, your number is {{reference}}.{{missing}}", { name: "Asha", reference: "MV-ABC123" }), "Hi Asha, your number is MV-ABC123.");
});

test("a message becomes safe HTML paragraphs with links", () => {
  const html = messageToHtml("Hi <b>Asha</b>\nSecond line\n\nRenew: https://www.mindvines.in/renew?ref=MV-1");
  assert.ok(html.includes("&lt;b&gt;Asha&lt;/b&gt;<br>Second line"));
  assert.ok(html.includes('<a href="https://www.mindvines.in/renew?ref=MV-1"'));
  assert.equal(html.match(/<p /g)?.length, 2);
  assert.equal(escapeHtml(`"&'`), "&quot;&amp;&#39;");
});

import { subscriptionConfirmationEmail } from "../src/lib/email-templates";

test("the subscription confirmation reads well and keeps user text out of the markup", () => {
  const data = {
    site: { name: "Mindvines", url: "https://www.mindvines.in", email: "info@mindvines.in" },
    parentName: "Priya <script>", childName: "Asha", reference: "MV-ABC123", renewal: false,
    programme: "Writing & Sketching", planName: "Both Writing & Sketching", ageGroup: "9-12", durationMonths: 3,
    startDate: "2026-11-06T00:00:00Z", expiryDate: "2027-02-06T00:00:00Z", amountPaise: 106200, taxPaise: 16200,
    paymentId: "pay_123", topics: [{ category: "Writing", titles: ["Under the Sea", "Kites"] }], queued: false,
  };
  const email = subscriptionConfirmationEmail(data);
  assert.match(email.subject, /Subscription confirmed.*Asha.*MV-ABC123/);
  assert.ok(email.message.includes("Amount paid: ₹1,062"));
  assert.ok(!email.html.includes("Renew or change plan"));
  assert.ok(email.html.includes("Under the Sea"));
  assert.ok(!email.html.includes("<script>"));
  const queued = subscriptionConfirmationEmail({ ...data, renewal: true, queued: true });
  assert.match(queued.subject, /Renewal confirmed/);
  assert.ok(queued.message.includes("right after the current subscription ends"));
});

import { renewalReminderDue } from "../src/lib/renewal-reminder";
import { renewalReminderEmail } from "../src/lib/email-templates";

test("the reminder shows only in the last 10 days of a running, un-renewed subscription", () => {
  const now = new Date("2026-11-06T10:00:00Z");
  const day = (n: number) => new Date(now.getTime() + n * 86_400_000);
  const running = { status: "ACTIVE", startDate: day(-20), expiryDate: day(9) };
  assert.equal(renewalReminderDue(running, [], now), true);
  assert.equal(renewalReminderDue({ ...running, expiryDate: day(10) }, [], now), true);
  assert.equal(renewalReminderDue({ ...running, expiryDate: day(11) }, [], now), false);
  assert.equal(renewalReminderDue({ ...running, expiryDate: day(-1) }, [], now), false);
  assert.equal(renewalReminderDue({ ...running, status: "CANCELLED" }, [], now), false);
  assert.equal(renewalReminderDue({ ...running, startDate: day(2) }, [], now), false);
  assert.equal(renewalReminderDue(running, [day(40)], now), false); // already renewed
  assert.equal(renewalReminderDue(running, [day(3)], now), true); // an older, shorter one doesn't count
});

test("the reminder email has the renew button and the number filled in", () => {
  const email = renewalReminderEmail({
    site: { name: "Mindvines", url: "https://www.mindvines.in" }, parentName: "Priya Nair", childName: "Asha", reference: "MV-ABC123",
    programme: "Writing only", planName: "Writing only", ageGroup: "9-12", expiryDate: "2026-11-15T00:00:00Z", daysLeft: 9,
  });
  assert.match(email.subject, /Renew Asha's Mindvines subscription: it ends in 9 days/);
  assert.ok(email.html.includes('href="https://www.mindvines.in/renew?ref=MV-ABC123"'));
  assert.ok(email.html.includes("Renew now"));
  assert.ok(email.message.includes("Renew here: https://www.mindvines.in/renew?ref=MV-ABC123"));
});

import { enquiryAlertEmail, enquiryThanksEmail } from "../src/lib/email-templates";

test("enquiry emails: a thank-you for the visitor and an alert for the team, with user text escaped", () => {
  const data = {
    site: { name: "Mindvines", url: "https://www.mindvines.in" }, name: "Priya <b>Nair</b>", email: "priya@example.com",
    phone: "+91 98000 00000", childAge: "9", message: "Hello <script>alert(1)</script>\nIs there a trial?", receivedAt: "2026-11-06T10:00:00Z",
    adminUrl: "https://www.mindvines.in/admin/enquiries",
  };
  const thanks = enquiryThanksEmail(data);
  assert.match(thanks.subject, /We got your message, Priya/);
  assert.ok(!thanks.html.includes("<script>") && !thanks.html.includes("<b>Nair"));
  assert.ok(thanks.html.includes("Is there a trial?"));
  const alert = enquiryAlertEmail(data);
  assert.match(alert.subject, /New enquiry from Priya/);
  assert.ok(alert.message.includes("Email: priya@example.com"));
  assert.ok(alert.html.includes('href="https://www.mindvines.in/admin/enquiries"'));
  assert.ok(!alert.html.includes("<script>"));
  assert.ok(enquiryAlertEmail({ ...data, message: "", phone: "" }).message.includes("No message."));
});
