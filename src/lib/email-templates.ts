/**
 * The wording and layout of each email the site sends, as pure functions from
 * plain data, so they can be tested and previewed without sending anything.
 * Every function returns what `sendEmail` takes: a subject, a plain-text
 * message and a branded HTML body.
 */
import { escapeHtml, fillTemplate } from "@/lib/email-content";

const COLORS = { ink: "#1f1a14", cocoa: "#4d3f32", amber: "#e5a63a", cream: "#faf3e3", sand: "#f1e9d8", muted: "#717171", line: "#eadfc9" };

const dateText = (value: Date | string) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

type Row = [label: string, value: string];

function layout(params: { eyebrow: string; site: { name: string; url: string; logoUrl?: string; email?: string; phone?: string }; preheader: string; heading: string; intro: string; rows: Row[]; sections?: { title: string; html: string }[]; button?: { label: string; url: string }; closing: string; footer?: string }) {
  const { site } = params;
  const rows = params.rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:10px 14px;font-size:14px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.line};width:42%">${escapeHtml(label)}</td><td style="padding:10px 14px;font-size:15px;font-weight:bold;color:${COLORS.ink};border-bottom:1px solid ${COLORS.line}">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const sections = (params.sections ?? [])
    .map((section) => `<h2 style="margin:28px 0 8px;font-size:16px;color:${COLORS.cocoa}">${escapeHtml(section.title)}</h2>${section.html}`)
    .join("");
  const button = params.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px"><tr><td style="background:${COLORS.amber};border-radius:999px"><a href="${escapeHtml(params.button.url)}" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:bold;color:${COLORS.ink};text-decoration:none">${escapeHtml(params.button.label)}</a></td></tr></table>`
    : "";
  const brand = site.logoUrl
    ? `<img src="${escapeHtml(site.logoUrl)}" alt="${escapeHtml(site.name)}" width="150" style="display:block;border:0;height:auto">`
    : `<span style="font-size:24px;font-weight:bold;color:${COLORS.cocoa}">${escapeHtml(site.name)}</span>`;
  const contact = [site.email && `<a href="mailto:${escapeHtml(site.email)}" style="color:${COLORS.cocoa}">${escapeHtml(site.email)}</a>`, site.phone && escapeHtml(site.phone)].filter(Boolean).join(" &nbsp;·&nbsp; ");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(params.heading)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.cream};font-family:Arial,Helvetica,sans-serif;color:${COLORS.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(params.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
<tr><td style="padding:0 4px 16px">${brand}</td></tr>
<tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${COLORS.line}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:${COLORS.sand};padding:28px 32px;border-bottom:4px solid ${COLORS.amber}">
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${COLORS.muted}">${escapeHtml(params.eyebrow)}</p>
<h1 style="margin:0;font-size:26px;line-height:1.25;color:${COLORS.cocoa}">${escapeHtml(params.heading)}</h1></td></tr>
<tr><td style="padding:28px 32px;font-size:16px;line-height:1.6">
<p style="margin:0 0 20px">${escapeHtml(params.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.line};border-radius:12px;border-collapse:separate;overflow:hidden">${rows}</table>
${sections}${button}
<p style="margin:28px 0 0">${escapeHtml(params.closing)}</p>
</td></tr></table></td></tr>
<tr><td style="padding:20px 8px;text-align:center;font-size:13px;line-height:1.6;color:${COLORS.muted}">
${contact}<br><a href="${escapeHtml(site.url)}" style="color:${COLORS.muted}">${escapeHtml(site.url.replace(/^https?:\/\//, ""))}</a><br>${escapeHtml(params.footer ?? "You are receiving this because of a subscription made with this email address.")}</td></tr>
</table></td></tr></table></body></html>`;
}

export type SubscriptionEmailData = {
  site: { name: string; url: string; logoUrl?: string; email?: string; phone?: string };
  parentName: string;
  childName: string;
  reference: string;
  renewal: boolean;
  programme: string;
  planName: string;
  ageGroup: string;
  durationMonths: number;
  startDate: Date | string;
  expiryDate: Date | string;
  /** What was paid, in paise, GST included. */
  amountPaise: number;
  taxPaise: number;
  paymentId?: string | null;
  topics?: { category: string; titles: string[] }[];
  /** True when a renewal starts later, after the current subscription ends. */
  queued: boolean;
};

/** Sent once, when a payment is verified and the subscription becomes active (or queued, for an early renewal). */
export function subscriptionConfirmationEmail(data: SubscriptionEmailData) {
  const firstName = data.parentName.trim().split(/\s+/)[0] || "there";
  const duration = data.durationMonths === 1 ? "1 month" : `${data.durationMonths} months`;
  const heading = data.renewal ? `${data.childName}'s subscription is renewed` : `Welcome to ${data.site.name}, ${data.childName}!`;
  const subject = data.renewal
    ? `Renewal confirmed: ${data.childName}'s ${data.site.name} subscription (${data.reference})`
    : `Subscription confirmed: welcome to ${data.site.name}, ${data.childName}! (${data.reference})`;
  const intro = data.queued
    ? `Hi ${firstName}, thank you! Your renewal is confirmed. It begins on ${dateText(data.startDate)}, right after the current subscription ends, so no days are lost.`
    : `Hi ${firstName}, thank you! Your payment was received and ${data.childName}'s subscription is active.`;

  const rows: Row[] = [
    ["Registration number", data.reference],
    ["Child", data.childName],
    ["Programme", data.programme || data.planName],
    ...(data.planName && data.planName !== data.programme ? ([["Plan", data.planName]] as Row[]) : []),
    ["Age group", `Ages ${data.ageGroup}`],
    ["Duration", duration],
    [data.queued ? "Starts" : "Started", dateText(data.startDate)],
    ["Valid until", dateText(data.expiryDate)],
    ["GST included", rupees(data.taxPaise)],
    ["Amount paid", rupees(data.amountPaise)],
    ...(data.paymentId ? ([["Payment ID", data.paymentId]] as Row[]) : []),
  ];

  const topics = (data.topics ?? []).filter((item) => item.titles.length > 0);
  const sections = [
    ...(topics.length > 0
      ? [{
          title: `${data.childName}'s favourite topics`,
          html: topics
            .map((item) => `<p style="margin:8px 0 2px;font-size:14px;font-weight:bold;color:${COLORS.cocoa}">${escapeHtml(item.category)}</p><p style="margin:0;font-size:14px;line-height:1.6;color:${COLORS.ink}">${item.titles.map(escapeHtml).join(" &middot; ")}</p>`)
            .join(""),
        }]
      : []),
    {
      title: "What happens next",
      html: `<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.7"><li>Keep your registration number <strong>${escapeHtml(data.reference)}</strong>. You need it to renew.</li><li>Journals and updates reach you through the programme; reply to this email if you have any questions.</li></ul>`,
    },
  ];

  const lines = [
    `Hi ${firstName},`,
    "",
    intro,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Thank you for being part of ${data.site.name}.`,
  ];

  return {
    subject,
    message: lines.join("\n"),
    html: layout({
      eyebrow: "Payment received",
      site: data.site,
      preheader: `${data.childName}'s ${data.programme || data.planName} subscription, valid until ${dateText(data.expiryDate)}.`,
      heading,
      intro,
      rows,
      sections,
      closing: `Thank you for being part of ${data.site.name}. We can't wait to read what ${data.childName} writes and draws.`,
    }),
  };
}

/** Staff alert, sent independently of the parent's confirmation email. */
export function subscriptionAdminAlertEmail(data: SubscriptionEmailData & { parentEmail: string; parentPhone: string; adminUrl: string }) {
  const event = data.renewal ? "Subscription renewed" : "New subscriber";
  const rows: Row[] = [
    ["Registration number", data.reference],
    ["Parent", data.parentName],
    ["Email", data.parentEmail],
    ["Phone", data.parentPhone],
    ["Child", data.childName],
    ["Programme", data.programme || data.planName],
    ["Plan", data.planName],
    ["Age group", `Ages ${data.ageGroup}`],
    ["Duration", data.durationMonths === 1 ? "1 month" : `${data.durationMonths} months`],
    ["Starts", dateText(data.startDate)],
    ["Valid until", dateText(data.expiryDate)],
    ["Status", data.queued ? "Upcoming" : "Active"],
    ["GST included", rupees(data.taxPaise)],
    ["Amount paid", rupees(data.amountPaise)],
    ...(data.paymentId ? ([["Payment ID", data.paymentId]] as Row[]) : []),
  ];
  const intro = `${data.parentName}'s payment for ${data.childName}'s ${data.programme || data.planName} subscription has been confirmed.`;
  return {
    subject: `${event}: ${data.childName} (${data.reference})`,
    message: [event, "", intro, "", ...rows.map(([label, value]) => `${label}: ${value}`), "", `Open in admin: ${data.adminUrl}`].join("\n"),
    html: layout({
      site: data.site,
      eyebrow: "Payment received",
      preheader: `${event} · ${data.reference} · ${rupees(data.amountPaise)} paid`,
      heading: `${event}: ${data.childName}`,
      intro,
      rows,
      button: { label: "View subscriber", url: data.adminUrl },
      closing: "This alert was sent automatically after payment confirmation.",
      footer: "You receive subscriber alerts at the notification email configured in Admin Settings.",
    }),
  };
}

export type RenewalReminderData = {
  site: SubscriptionEmailData["site"];
  parentName: string;
  childName: string;
  reference: string;
  programme: string;
  planName: string;
  ageGroup: string;
  expiryDate: Date | string;
  daysLeft: number;
};

/** Sent when an admin clicks "Send renewal reminder" for a subscription that is about to end. */
export function renewalReminderEmail(data: RenewalReminderData) {
  const firstName = data.parentName.trim().split(/\s+/)[0] || "there";
  const renewUrl = `${data.site.url}/renew?ref=${encodeURIComponent(data.reference)}`;
  const when = data.daysLeft <= 1 ? "ends today or tomorrow" : `ends in ${data.daysLeft} days`;
  const subject = `Renew ${data.childName}'s ${data.site.name} subscription: it ${when}`;
  const intro = `Hi ${firstName}, ${data.childName}'s ${data.programme || data.planName} subscription ${when}, on ${dateText(data.expiryDate)}. Renew now and the new plan starts right after it ends, so ${data.childName} doesn't miss a single journal.`;
  const rows: Row[] = [
    ["Registration number", data.reference],
    ["Child", data.childName],
    ["Current plan", data.programme && data.planName && data.planName !== data.programme ? `${data.programme} · ${data.planName}` : data.programme || data.planName],
    ["Age group", `Ages ${data.ageGroup}`],
    ["Ends on", dateText(data.expiryDate)],
  ];
  return {
    subject,
    message: [`Hi ${firstName},`, "", intro, "", ...rows.map(([label, value]) => `${label}: ${value}`), "", `Renew here: ${renewUrl}`, "", `Thank you for being part of ${data.site.name}.`].join("\n"),
    html: layout({
      eyebrow: "Renewal reminder",
      site: data.site,
      preheader: `${data.childName}'s subscription ${when}. Renew to keep the journals coming.`,
      heading: `Time to renew ${data.childName}'s subscription`,
      intro,
      rows,
      sections: [{
        title: "How renewing works",
        html: `<ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.7"><li>Use your registration number <strong>${escapeHtml(data.reference)}</strong>; the link below already has it filled in.</li><li>Keep the same plan or choose a different one, such as another duration or programme.</li><li>Your new plan starts when the current one ends, so no days are lost.</li></ul>`,
      }],
      button: { label: "Renew now", url: renewUrl },
      closing: `Thank you for being part of ${data.site.name}. We'd love to keep reading what ${data.childName} writes and draws.`,
    }),
  };
}

export type EnquiryEmailData = {
  site: SubscriptionEmailData["site"];
  name: string;
  email: string;
  phone?: string | null;
  childAge?: string | null;
  message?: string | null;
  receivedAt: Date | string;
  /** Link to the enquiry in the admin, for the staff email. */
  adminUrl?: string;
};

/** The thank-you a visitor gets right after sending the "Let's Connect" form. */
export function enquiryThanksEmail(data: EnquiryEmailData) {
  const firstName = data.name.trim().split(/\s+/)[0] || "there";
  const intro = `Hi ${firstName}, thank you for getting in touch with ${data.site.name}! We have your message and someone from our team will reply soon, usually within one working day.`;
  const rows: Row[] = [
    ["Name", data.name],
    ...(data.childAge ? ([["Child's age", data.childAge]] as Row[]) : []),
    ...(data.phone ? ([["Phone", data.phone]] as Row[]) : []),
    ["Received", dateText(data.receivedAt)],
  ];
  const message = data.message?.trim();
  return {
    subject: `We got your message, ${firstName}: ${data.site.name}`,
    message: [`Hi ${firstName},`, "", intro, ...(message ? ["", "Your message:", message] : []), "", `With warm wishes,`, `The ${data.site.name} team`].join("\n"),
    html: layout({
      eyebrow: "Message received",
      site: data.site,
      preheader: `Thanks for contacting ${data.site.name}. We'll be in touch soon.`,
      heading: "Thanks for getting in touch!",
      intro,
      rows,
      sections: message
        ? [{ title: "Your message", html: `<p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-line;background:${COLORS.cream};border-radius:12px;padding:14px 16px">${escapeHtml(message)}</p>` }]
        : [],
      closing: `With warm wishes, the ${data.site.name} team.`,
    }),
  };
}

/** The alert staff get when someone sends the form. Reply goes straight to the visitor (set by the sender). */
export function enquiryAlertEmail(data: EnquiryEmailData) {
  const rows: Row[] = [
    ["Name", data.name],
    ["Email", data.email],
    ["Phone", data.phone || "Not given"],
    ["Child's age", data.childAge || "Not given"],
    ["Received", dateText(data.receivedAt)],
  ];
  const message = data.message?.trim();
  return {
    subject: `New enquiry from ${data.name} (${data.site.name} website)`,
    message: [`New "Let's Connect" enquiry`, "", ...rows.map(([label, value]) => `${label}: ${value}`), "", message ? `Message:\n${message}` : "No message.", ...(data.adminUrl ? ["", `Open in admin: ${data.adminUrl}`] : [])].join("\n"),
    html: layout({
      eyebrow: "New enquiry",
      site: data.site,
      preheader: `${data.name} sent a message through the website.`,
      heading: `New enquiry from ${data.name}`,
      intro: "Someone just used the Let's Connect form. Reply to this email to answer them directly.",
      rows,
      sections: [{ title: "Message", html: `<p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-line;background:${COLORS.cream};border-radius:12px;padding:14px 16px">${escapeHtml(message || "No message.")}</p>` }],
      button: data.adminUrl ? { label: "Open in admin", url: data.adminUrl } : undefined,
      closing: "This alert was sent automatically.",
    }),
  };
}

export function registrationRecoveryEmail(data: { site: SubscriptionEmailData["site"]; code: string; expiresInMinutes: number }) {
  const intro = `Use this verification code to find your ${data.site.name} registration numbers and choose a subscription to renew.`;
  return {
    subject: `Your ${data.site.name} registration recovery code`,
    message: [intro, "", `Verification code: ${data.code}`, `This code expires in ${data.expiresInMinutes} minutes and can be used once.`, "", "If you did not request this code, you can ignore this email. Do not share this code with anyone."].join("\n"),
    html: layout({
      site: data.site,
      eyebrow: "Find your registrations",
      preheader: `Your verification code expires in ${data.expiresInMinutes} minutes.`,
      heading: "Your verification code",
      intro,
      rows: [["Verification code", data.code], ["Expires in", `${data.expiresInMinutes} minutes`]],
      closing: "This code can be used once. If you did not request it, you can ignore this email. Do not share this code with anyone.",
      footer: "This email was sent in response to a registration recovery request.",
    }),
  };
}

/** Handy for previews and tests: fills `{{name}}` placeholders in a template string. */
export { fillTemplate };
