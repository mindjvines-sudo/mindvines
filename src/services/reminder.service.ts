import "server-only";
import { isValidObjectId } from "mongoose";
import { SITE } from "@/lib/content";
import { renewalReminderEmail } from "@/lib/email-templates";
import { connectToDatabase } from "@/lib/mongodb";
import { remainingDays } from "@/lib/subscription-status";
import { renewalReminderDue } from "@/lib/renewal-reminder";
import { Subscription } from "@/models/Subscription";
import { sendEmail } from "@/services/email.service";
import { EMAIL_LOGO_CID, loadEmailLogo } from "@/services/email-logo.service";

export type ReminderResult = { ok: true; email: string } | { ok: false; message: string };

/**
 * The admin's "Send renewal reminder" button. Checks again, on the server, that
 * the subscription really ends within the window and has no later one paid, so
 * a stale page can't send a pointless email. Records when it went out.
 */
export async function sendRenewalReminder(subscriptionId: string): Promise<ReminderResult> {
  if (!isValidObjectId(subscriptionId)) return { ok: false, message: "Subscription not found." };
  await connectToDatabase();
  const subscription = await Subscription.findById(subscriptionId).lean();
  if (!subscription?.registration?.email || !subscription.planSnapshot) return { ok: false, message: "Subscription not found." };

  const now = new Date();
  const later = subscription.registrationId
    ? await Subscription.find({ registrationId: subscription.registrationId, status: "ACTIVE", _id: { $ne: subscription._id } }).select("expiryDate").lean()
    : [];
  if (!renewalReminderDue(subscription, later.map((item) => item.expiryDate), now)) {
    return { ok: false, message: "A reminder can only be sent in the last 10 days of a running subscription that hasn't been renewed." };
  }

  const logo = await loadEmailLogo();
  const email = renewalReminderEmail({
    site: { name: SITE.name, url: SITE.url, logoUrl: logo ? `cid:${EMAIL_LOGO_CID}` : undefined, email: SITE.email, phone: SITE.phone },
    parentName: subscription.registration.name,
    childName: subscription.registration.childName || "your child",
    reference: subscription.reference ?? "",
    programme: subscription.planSnapshot.programme ?? "",
    planName: subscription.planSnapshot.name,
    ageGroup: subscription.planSnapshot.ageGroup,
    expiryDate: subscription.expiryDate!,
    daysLeft: remainingDays(subscription.expiryDate, now),
  });
  const result = await sendEmail({ to: subscription.registration.email, ...email, attachments: logo ? [logo] : undefined });
  if (!result.ok) {
    return { ok: false, message: result.reason === "not_configured" ? "Email isn't set up yet (SMTP settings are missing)." : "The email could not be sent. Please try again." };
  }
  await Subscription.updateOne({ _id: subscriptionId }, { $set: { renewalReminderSentAt: now }, $inc: { renewalReminderCount: 1 } });
  return { ok: true, email: subscription.registration.email };
}
