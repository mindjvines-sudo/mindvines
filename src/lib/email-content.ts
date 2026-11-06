/**
 * The parts of sending an email that need no network: checking addresses,
 * keeping header text on one line, and turning a plain message into a simple,
 * safe HTML body. Kept apart from the sender so they can be tested alone.
 */
import { z } from "zod";

const addressSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

/** One address or a list, each checked and de-duplicated. Returns null if any is invalid or none given. */
export function parseRecipients(input: string | string[] | undefined | null): string[] | null {
  const list = (Array.isArray(input) ? input : input ? [input] : []).map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return null;
  const parsed = list.map((item) => addressSchema.safeParse(item));
  if (parsed.some((result) => !result.success)) return null;
  return [...new Set(parsed.map((result) => result.data!))];
}

/** A subject (or display name) on one line: line breaks are what header-injection attacks are made of. */
export function singleLine(value: string, max = 200) {
  return value.replace(/[\r\n\u2028\u2029]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

/**
 * `{{name}}` placeholders in a text, filled from `variables`. Unknown names are
 * left empty rather than printed, and values are used as plain text (the HTML
 * body escapes them afterwards).
 */
export function fillTemplate(template: string, variables: Record<string, string | number | null | undefined> = {}) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, name: string) => String(variables[name] ?? ""));
}

/** Plain message → paragraphs: blank lines separate paragraphs, single line breaks stay, http(s) links become links. */
export function messageToHtml(message: string) {
  const link = (escaped: string) => escaped.replace(/\bhttps?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:#4d3f32">${url}</a>`);
  return message
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 16px;line-height:1.6">${link(escapeHtml(paragraph)).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** The branded wrapper every email shares. `body` must already be safe HTML. */
export function wrapEmailHtml({ brand, body, footer }: { brand: string; body: string; footer?: string }) {
  return `<!doctype html><html><body style="margin:0;background:#faf3e3;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#1f1a14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:22px;font-weight:bold;color:#4d3f32;padding-bottom:20px">${escapeHtml(brand)}</td></tr>
<tr><td style="font-size:16px">${body}</td></tr>
${footer ? `<tr><td style="font-size:13px;color:#717171;padding-top:16px;border-top:1px solid #eee">${escapeHtml(footer)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}
