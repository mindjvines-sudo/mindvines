/**
 * Test data for the "Send renewal reminder" button: 10 paid registrations whose
 * subscriptions end in 2 to 10 days. Everything is marked so it can be removed:
 * references start with MV-QA and parent emails end with @example.com (a
 * reserved domain that cannot receive mail, so no real person is ever emailed).
 *
 *   npx tsx scripts/seed-expiring-test-data.mts          adds the 10 records
 *   npx tsx scripts/seed-expiring-test-data.mts --remove deletes them again
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const mongoose = require("mongoose");

const { connectToDatabase } = await import("@/lib/mongodb");
const { Registration } = await import("@/models/Registration");
const { Subscription } = await import("@/models/Subscription");
const { Subscriber } = await import("@/models/Subscriber");
const { Payment } = await import("@/models/Payment");
const { SubscriptionPlan } = await import("@/models/SubscriptionPlan");
const { Programme } = await import("@/models/Programme");
const { addMonths, computeAmounts, DAY_MS } = await import("@/lib/subscription-status");
const { gstRatePercent } = await import("@/lib/gst");

await connectToDatabase();

const REF = /^MV-QA/;
const EMAIL = /@example\.com$/;

if (process.argv.includes("--remove")) {
  const regs = await Registration.find({ reference: REF }).select("_id").lean();
  const subs = await Subscription.find({ reference: REF }).select("_id").lean();
  const payments = await Payment.deleteMany({ razorpayOrderId: /^order_QA_/ });
  const subscriptions = await Subscription.deleteMany({ _id: { $in: subs.map((s: { _id: unknown }) => s._id) } });
  const registrations = await Registration.deleteMany({ _id: { $in: regs.map((r: { _id: unknown }) => r._id) } });
  const subscribers = await Subscriber.deleteMany({ email: EMAIL });
  console.log("removed", { registrations: registrations.deletedCount, subscriptions: subscriptions.deletedCount, payments: payments.deletedCount, subscribers: subscribers.deletedCount });
  await mongoose.disconnect();
  process.exit(0);
}

if ((await Registration.countDocuments({ reference: REF })) > 0) {
  console.log("Test data already exists. Run with --remove first.");
  process.exit(1);
}

const plans = await SubscriptionPlan.find({ status: "PUBLISHED", durationMonths: { $in: [1, 3] } }).sort({ ageGroup: 1, durationMonths: 1, displayOrder: 1 }).lean();
if (plans.length === 0) throw new Error("No published plans to attach the test data to.");
const programmes = await Programme.find({ _id: { $in: plans.map((p: { programme?: unknown }) => p.programme) } }).lean();
const gst = gstRatePercent();
const now = new Date();

const people = [
  ["Aarav Menon", "Sunita Menon", "2016-03-14"], ["Diya Nair", "Rahul Nair", "2015-07-02"], ["Kabir Shah", "Neha Shah", "2017-11-21"],
  ["Anaya Iyer", "Vikram Iyer", "2014-01-30"], ["Rohan Das", "Mita Das", "2016-09-09"], ["Ishita Rao", "Karthik Rao", "2013-05-18"],
  ["Vihaan Gupta", "Anita Gupta", "2017-02-11"], ["Meera Pillai", "Suresh Pillai", "2014-12-05"], ["Arjun Reddy", "Latha Reddy", "2015-04-27"],
  ["Tara Joseph", "Mathew Joseph", "2016-06-16"],
];
const daysLeft = [10, 9, 8, 7, 6, 5, 4, 3, 2, 2];

for (let i = 0; i < 10; i += 1) {
  const n = i + 1;
  const [child, parent, dob] = people[i];
  const plan = plans[i % plans.length];
  const programme = programmes.find((p: { _id: { equals(x: unknown): boolean } }) => plan.programme && p._id.equals(plan.programme));
  const programmeName = programme?.name ?? plan.name;
  const reference = `MV-QA${String(n).padStart(4, "0")}`;
  const email = `qa.parent${n}@example.com`;
  const phone = `98000000${String(n).padStart(2, "0")}`;
  // An hour short of N whole days, so the admin shows "N days left".
  const expiry = new Date(now.getTime() + daysLeft[i] * DAY_MS - 60 * 60 * 1000);
  const start = addMonths(expiry, -plan.durationMonths);
  const amounts = computeAmounts(plan.price, gst);
  const age = String(new Date().getFullYear() - Number(dob.slice(0, 4)));

  const subscriber = await Subscriber.create({ name: parent, email, phone: `+91${phone}`, childName: child, childAge: age });
  const registration = await Registration.create({
    reference, status: "COMPLETED", tokenHash: "qa-test-data", plan: plan._id, programme: plan.programme, programmeName,
    child: { name: child, dob, school: "QA Test School" },
    parent: { name: parent, email, phoneCountry: "IN", phoneDial: "+91", phone },
    address: { countryCode: "IN", country: "India", line1: "1 Test Street", city: "Chennai", postalCode: "600001" },
    consents: { terms: { given: true, at: start }, featureWork: { given: true, at: start }, whatsappUpdates: { given: false, at: start } },
    preferences: { nickname: child.split(" ")[0], selections: [], savedAt: start },
    subscriber: subscriber._id, completedAt: start,
  });
  const subscription = await Subscription.create({
    subscriber: subscriber._id, registrationId: registration._id, reference, renewal: false, plan: plan._id,
    planSnapshot: { name: plan.name, ageGroup: plan.ageGroup, price: plan.price, durationMonths: plan.durationMonths, programme: programmeName },
    registration: {
      name: parent, email, phone: `+91 ${phone}`, childName: child, childAge: age, childDob: dob, school: "QA Test School", nickname: child.split(" ")[0],
      address: { countryCode: "IN", country: "India", line: "1 Test Street", city: "Chennai", postalCode: "600001" },
    },
    status: "ACTIVE", startDate: start, expiryDate: expiry, confirmationEmailSentAt: start,
  });
  const payment = await Payment.create({
    subscription: subscription._id, subscriber: subscriber._id, plan: plan._id,
    razorpayOrderId: `order_QA_${n}`, razorpayPaymentId: `pay_QA_${n}`,
    baseAmount: amounts.baseAmount, taxAmount: amounts.taxAmount, amount: amounts.totalAmount, currency: "INR", status: "PAID", paidAt: start,
    verification: { signatureVerified: true, verifiedVia: "CHECKOUT", verifiedAt: start, razorpayStatus: "captured" },
  });
  await Subscription.updateOne({ _id: subscription._id }, { $set: { payment: payment._id } });
  await Registration.updateOne({ _id: registration._id }, { $set: { subscription: subscription._id } });
  console.log(reference, child, `${programmeName} · ${plan.durationMonths} mo`, `${daysLeft[i]} days left`, email);
}
await mongoose.disconnect();
process.exit(0);
