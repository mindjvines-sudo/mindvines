import "server-only";
import { safeImage, safeLink, stripTags } from "@/lib/cms/sanitize";

const MAX_ITEMS = 100;
const TEXT_LIMIT = 6_000;
const LONG_TEXT_LIMIT = 150_000;
const LINK_KEYS = new Set(["href", "url", "link"]);
const LONG_KEYS = new Set(["body"]);

/**
 * Makes saved component content fit the shape the component was built for.
 *
 * `template` is the component's built-in content. Whatever the editor sent is
 * walked against it: keys the component doesn't know are dropped, missing keys
 * keep their built-in value, text loses all markup, links and image addresses
 * must be safe, and lists take their item shape from the built-in first item.
 * A component therefore can never receive something it can't draw, and nothing
 * in it can carry script. Problems that need the editor's attention (a bad
 * link) are collected in `issues` rather than silently changed.
 */
export function conform(template: unknown, value: unknown, path: string, issues: { path: string; message: string }[], key = ""): unknown {
  if (typeof template === "string") {
    if (typeof value !== "string") return template;
    if (LINK_KEYS.has(key)) {
      const link = safeLink(value);
      if (link === null) issues.push({ path, message: "Use a link on this site, an https address, or a mailto: / tel: link." });
      return link ?? template;
    }
    if (key === "src") {
      if (value === "") return template;
      const image = safeImage(value);
      if (image === null) issues.push({ path, message: "Images must come from the media library." });
      return image ?? template;
    }
    return stripTags(value.slice(0, LONG_KEYS.has(key) ? LONG_TEXT_LIMIT : TEXT_LIMIT));
  }
  if (typeof template === "number") return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(value, 0), 100_000) : template;
  if (typeof template === "boolean") return typeof value === "boolean" ? value : template;
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return template;
    const item = template[0];
    if (item === undefined) return [];
    return value.slice(0, MAX_ITEMS).map((entry, index) => conform(item, entry, `${path}.${index}`, issues, key));
  }
  if (template && typeof template === "object") {
    const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
    return Object.fromEntries(Object.entries(template).map(([name, inner]) => [name, conform(inner, source[name], `${path}.${name}`, issues, name)]));
  }
  return template;
}
