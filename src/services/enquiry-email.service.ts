import "server-only";
import { siteConfig } from "@/config/site";
import { SITE } from "@/lib/content";
import { enquiryAlertEmail, enquiryThanksEmail } from "@/lib/email-templates";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendAdminEmail, sendEmail } from "@/services/email.service";
import { EMAIL_LOGO_CID, loadEmailLogo } from "@/services/email-logo.service";

/**
 * Emails sent when someone submits the "Let's Connect" form: an alert to the
 * team (replying to it answers the visitor) and a thank-you to the visitor.
 * Never throws: the enquiry is already saved, and a mail problem must not make
 * the visitor think it wasn't.
 */
export async function sendEnquiryEmails(enquiry: { _id: { toString(): string }; name: string; email: string; phone?: string | null; childAge?: string | null; message?: string | null; createdAt?: Date }) {
  try {
    const logo = await loadEmailLogo();
    const data = {
      site: { name: SITE.name, url: SITE.url, logoUrl: logo ? `cid:${EMAIL_LOGO_CID}` : undefined, email: SITE.email, phone: SITE.phone },
      name: enquiry.name,
      email: enquiry.email,
      phone: enquiry.phone,
      childAge: enquiry.childAge,
      message: enquiry.message,
      receivedAt: enquiry.createdAt ?? new Date(),
      adminUrl: `${siteConfig.url}/admin/enquiries`,
    };
    const attachments = logo ? [logo] : undefined;

    // The thank-you goes to whatever address was typed, so cap it per address:
    // the form must not be usable to mail a stranger over and over.
    const mayThank = checkRateLimit(`contact-thanks:${enquiry.email.toLowerCase()}`, { limit: 2, windowMs: 60 * 60 * 1000 }).allowed;

    await Promise.allSettled([
      sendAdminEmail({ ...enquiryAlertEmail(data), replyTo: enquiry.email, attachments }),
      mayThank ? sendEmail({ to: enquiry.email, ...enquiryThanksEmail(data), attachments }) : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("[email] enquiry emails failed:", error instanceof Error ? error.message : error);
  }
}
