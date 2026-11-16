import "server-only";
import sanitize from "sanitize-html";

/**
 * Every piece of HTML or URL that reaches the live site passes through here on
 * the server, whatever the editor in the browser did. The approach is an
 * allow-list: anything not named is removed, scripts and event handlers
 * included, and links and embeds may only point where we say.
 */

export const EMBED_HOSTS = ["www.youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"];

const TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "hr", "a", "img", "iframe", "span", "div", "code", "pre", "table", "thead", "tbody", "tr", "th", "td"];

const ALIGN = /^(left|center|right)$/;

export function sanitizeRichHtml(html: string): string {
  return sanitize(html, {
    allowedTags: TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      iframe: ["src", "width", "height", "title", "allowfullscreen", "loading"],
      p: ["style"], h2: ["style"], h3: ["style"], h4: ["style"],
      th: ["colspan", "rowspan"], td: ["colspan", "rowspan"],
    },
    // Only text alignment survives of all inline CSS.
    allowedStyles: { "*": { "text-align": [ALIGN] } },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"], iframe: ["https"] },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    allowedIframeHostnames: EMBED_HOSTS,
    // A script, style, textarea, option or any unlisted tag is dropped with its contents rather than shown as text.
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "template"],
    transformTags: {
      a: (tag, attribs) => {
        const external = /^https?:/i.test(attribs.href ?? "");
        return { tagName: "a", attribs: { ...attribs, ...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {}) } };
      },
      iframe: (tag, attribs) => ({ tagName: "iframe", attribs: { ...attribs, loading: "lazy", allowfullscreen: "true" } }),
    },
    exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src,
  }).trim();
}

const BLOCK_TAGS = [...TAGS, "h5", "h6", "section", "article", "header", "footer", "figure", "figcaption", "small", "sup", "sub", "mark", "dl", "dt", "dd", "caption", "tfoot", "details", "summary"];
const BLOCK_STYLE_TAGS = ["p", "div", "span", "section", "article", "header", "footer", "h2", "h3", "h4", "h5", "h6", "a", "li", "ul", "ol", "blockquote", "figure", "figcaption", "th", "td", "img", "table", "small", "mark"];
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i, /^[a-z]{3,20}$/i];
const LENGTH = [/^-?\d{1,4}(\.\d+)?(px|em|rem|%|vw|vh)?$/, /^auto$/];
const SPACING = [/^(-?\d{1,4}(\.\d+)?(px|em|rem|%)?|auto)(\s+(-?\d{1,4}(\.\d+)?(px|em|rem|%)?|auto)){0,3}$/];

/**
 * The advanced HTML section: everything `sanitizeRichHtml` allows, plus layout
 * tags and a short list of presentation-only CSS properties with value
 * patterns. Never positioning, url(), expression(), behaviour or anything that
 * could cover the page or load a resource.
 */
export function sanitizeHtmlBlock(html: string): string {
  const styled = Object.fromEntries(BLOCK_STYLE_TAGS.map((tag) => [tag, ["style"]]));
  return sanitize(html, {
    allowedTags: BLOCK_TAGS,
    allowedAttributes: {
      ...styled,
      a: ["href", "title", "target", "rel", "style"],
      img: ["src", "alt", "width", "height", "style"],
      iframe: ["src", "width", "height", "title", "allowfullscreen", "loading"],
      th: ["colspan", "rowspan", "style"], td: ["colspan", "rowspan", "style"],
      details: ["open"],
    },
    allowedStyles: {
      "*": {
        "text-align": [ALIGN],
        color: COLOR,
        "background-color": COLOR,
        "font-size": LENGTH,
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic)$/],
        "line-height": LENGTH,
        "letter-spacing": LENGTH,
        "text-decoration": [/^(none|underline|line-through)$/],
        "text-transform": [/^(none|uppercase|lowercase|capitalize)$/],
        margin: SPACING, "margin-top": LENGTH, "margin-bottom": LENGTH, "margin-left": LENGTH, "margin-right": LENGTH,
        padding: SPACING, "padding-top": LENGTH, "padding-bottom": LENGTH, "padding-left": LENGTH, "padding-right": LENGTH,
        "border-radius": SPACING,
        border: [/^\d{1,2}px\s+(solid|dashed|dotted)\s+(#[0-9a-f]{3,8}|[a-z]{3,20})$/i],
        "max-width": LENGTH, width: LENGTH, height: LENGTH,
        display: [/^(block|inline|inline-block|none)$/],
      },
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"], iframe: ["https"] },
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: false,
    allowedIframeHostnames: EMBED_HOSTS,
    disallowedTagsMode: "discard",
    nonTextTags: ["script", "style", "textarea", "option", "noscript", "template"],
    transformTags: {
      a: (tag, attribs) => {
        const external = /^https?:/i.test(attribs.href ?? "");
        return { tagName: "a", attribs: { ...attribs, ...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {}) } };
      },
      iframe: (tag, attribs) => ({ tagName: "iframe", attribs: { ...attribs, loading: "lazy", allowfullscreen: "true" } }),
    },
    exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src,
  }).trim();
}

/** Plain text fields: no markup at all. */
export function stripTags(value: string): string {
  return sanitize(value, { allowedTags: [], allowedAttributes: {} }).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

const SAFE_RELATIVE = /^\/(?!\/)[^\s\\]*$/;

/** Where a button or link may point: our own pages, https, mail or phone. Never javascript:, data: or a protocol-relative address. */
export function safeLink(value: string): string | null {
  const url = value.trim();
  if (!url) return "";
  if (SAFE_RELATIVE.test(url) || url.startsWith("#")) return url;
  if (/^(mailto|tel):[^\s]+$/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? (parsed.username || parsed.password ? null : parsed.toString()) : null;
  } catch {
    return null;
  }
}

/** Pictures come from our media library (Cloudinary) or our own files; arbitrary third-party images can track visitors. */
export function safeImage(value: string): string | null {
  const url = value.trim();
  if (!url) return "";
  if (SAFE_RELATIVE.test(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "res.cloudinary.com" && !parsed.username ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** A video address as a fixed, embeddable form: YouTube or Vimeo become their embed URL; an uploaded file stays a file. */
export function videoSource(value: string): { kind: "iframe" | "file"; src: string } | null {
  const url = value.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const id = parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : parsed.searchParams.get("v");
      return id && /^[\w-]{6,20}$/.test(id) ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return /^[\w-]{6,20}$/.test(id) ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id && /^\d{5,12}$/.test(id) ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : null;
    }
    if (parsed.hostname === "res.cloudinary.com" && /\.(mp4|webm|mov)$/i.test(parsed.pathname)) return { kind: "file", src: parsed.toString() };
    return null;
  } catch {
    return null;
  }
}
