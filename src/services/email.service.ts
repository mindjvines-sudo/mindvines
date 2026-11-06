import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { fillTemplate, messageToHtml, parseRecipients, singleLine, wrapEmailHtml } from "@/lib/email-content";
import { SITE } from "@/lib/content";

/**
 * The one place the site sends email from. Anything that needs to email
 * someone (a receipt, a renewal reminder, an enquiry alert…) calls
 * `sendEmail` and says only who to, what subject and what message.
 *
 * It never throws: a mail problem must not break the payment or form that
 * triggered it. Callers get `{ ok: true }` or `{ ok: false, reason }` and may
 * log or ignore it. Without SMTP settings it sends nothing and says so
 * (`reason: "not_configured"`), so local work needs no mail server.
 *
 * Settings (all server-only environment variables):
 *   SMTP_HOST, SMTP_PORT (587 or 465), SMTP_SECURE ("true" for 465),
 *   SMTP_USER, SMTP_PASSWORD, EMAIL_FROM, EMAIL_FROM_NAME,
 *   EMAIL_REPLY_TO (optional), EMAIL_ADMIN_TO (optional, staff alerts).
 */

export type SendEmailInput = {
  /** One address or several. */
  to: string | string[];
  subject: string;
  /** The plain-text message. Also used to build the HTML body unless `html` is given. */
  message: string;
  /** Values for `{{name}}` placeholders in the subject and message. */
  variables?: Record<string, string | number | null | undefined>;
  /** Your own HTML body (already safe), replacing the one built from `message`. */
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  /** Files to attach. Give a `cid` to show an image inside the HTML as `<img src="cid:…">`. */
  attachments?: { filename: string; content: string | Buffer; contentType?: string; cid?: string; encoding?: string }[];
};

export type SendEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: "not_configured" | "invalid_input" | "send_failed"; error?: string };

type Settings = { host: string; port: number; secure: boolean; user?: string; password?: string; from: string; fromName: string; replyTo?: string };

function readSettings(): Settings | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    user: process.env.SMTP_USER?.trim() || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from,
    fromName: singleLine(process.env.EMAIL_FROM_NAME || SITE.name, 80),
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
  };
}

let cached: { key: string; transporter: Transporter } | null = null;

/** One pooled connection per settings, reused across sends. */
function transporterFor(settings: Settings) {
  const key = JSON.stringify(settings);
  if (cached?.key !== key) {
    cached = {
      key,
      transporter: nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: settings.user ? { user: settings.user, pass: settings.password } : undefined,
        pool: true,
        connectionTimeout: 10_000,
        socketTimeout: 15_000,
      }),
    };
  }
  return cached.transporter;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const settings = readSettings();
  if (!settings) {
    console.warn("[email] SMTP_HOST / EMAIL_FROM are not set, so no email was sent.");
    return { ok: false, reason: "not_configured" };
  }

  const to = parseRecipients(input.to);
  const cc = input.cc ? parseRecipients(input.cc) : undefined;
  const bcc = input.bcc ? parseRecipients(input.bcc) : undefined;
  const replyTo = input.replyTo ? parseRecipients(input.replyTo)?.[0] : settings.replyTo;
  if (!to || cc === null || bcc === null || (input.replyTo && !replyTo)) return { ok: false, reason: "invalid_input", error: "Invalid email address." };

  const subject = singleLine(fillTemplate(input.subject, input.variables));
  const message = fillTemplate(input.message, input.variables).trim();
  if (!subject || !message) return { ok: false, reason: "invalid_input", error: "A subject and a message are required." };

  try {
    const info = await transporterFor(settings).sendMail({
      from: { name: settings.fromName, address: settings.from },
      to,
      cc: cc ?? undefined,
      bcc: bcc ?? undefined,
      replyTo,
      subject,
      text: message,
      html: input.html ?? wrapEmailHtml({ brand: SITE.name, body: messageToHtml(message), footer: `${SITE.name} · ${SITE.url}` }),
      attachments: input.attachments,
    });
    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const text = error instanceof Error ? error.message : "Unknown error";
    console.error("[email] send failed:", text);
    return { ok: false, reason: "send_failed", error: text };
  }
}

/** Email to the site's own staff (the `EMAIL_ADMIN_TO` address). */
export function sendAdminEmail(input: Omit<SendEmailInput, "to">) {
  const admin = process.env.EMAIL_ADMIN_TO?.trim();
  if (!admin) {
    console.warn("[email] EMAIL_ADMIN_TO is not set, so the staff email was not sent.");
    return Promise.resolve<SendEmailResult>({ ok: false, reason: "not_configured" });
  }
  return sendEmail({ ...input, to: admin.split(",") });
}
