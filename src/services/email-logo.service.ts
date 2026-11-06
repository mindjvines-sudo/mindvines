import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE } from "@/lib/content";
import { siteConfig } from "@/config/site";

export const EMAIL_LOGO_CID = "mindvines-logo";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };

/**
 * The site's current logo (the file the header shows, `SITE.logo.src`), read at
 * send time so replacing it changes every later email with no code change.
 * Reads the deployed file first; if the host doesn't ship `public/` with the
 * server code, fetches it from the site's own address instead. Returns null
 * when neither works, and the email then shows the name as text.
 */
export async function loadEmailLogo(): Promise<{ filename: string; content: Buffer; contentType: string; cid: string } | null> {
  const src = SITE.logo.src;
  const extension = path.extname(src).toLowerCase();
  const contentType = TYPES[extension];
  if (!contentType) return null;

  const attach = (content: Buffer) => ({ filename: `logo${extension}`, content, contentType, cid: EMAIL_LOGO_CID });

  try {
    return attach(await readFile(path.join(process.cwd(), "public", src)));
  } catch {
    // Not on disk here: fall through to the website.
  }
  try {
    const response = await fetch(new URL(src, siteConfig.url), { signal: AbortSignal.timeout(5_000), cache: "no-store" });
    if (response.ok && response.headers.get("content-type")?.startsWith("image/")) return attach(Buffer.from(await response.arrayBuffer()));
  } catch {
    // Unreachable: send without the image.
  }
  return null;
}
