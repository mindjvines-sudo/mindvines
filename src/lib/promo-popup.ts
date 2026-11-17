/** Shared by the site popup and the admin preview. No server code in here. */

export const PROMO_FREQUENCIES = [
  { value: "every", label: "Every page load" },
  { value: "session", label: "Once per session" },
  { value: "day", label: "Once per day" },
  { value: "visitor", label: "Once per visitor" },
] as const;

export type PromoFrequency = (typeof PROMO_FREQUENCIES)[number]["value"];

export type PromoImage = { src: string; width: number; height: number; alt: string };

/** What the browser needs to show a campaign. Only active, in-date campaigns ever reach it. */
export type PromoPopupConfig = {
  version: string;
  desktopImage: PromoImage | null;
  mobileImage: PromoImage | null;
  title: string;
  description: string;
  ctaLabel: string;
  ctaUrl: string;
  backgroundColor: string;
  /** 0–90 (percent). */
  overlayOpacity: number;
  delaySeconds: number;
  frequency: PromoFrequency;
};

/** Pages where a popup would get in the way of paying or renewing. */
export const PROMO_EXCLUDED_PATHS = ["/checkout", "/renew"];

const DAY_MS = 24 * 60 * 60 * 1000;
const storageKey = (version: string) => `mv-promo-${version}`;

/** Whether this visitor has already been shown this campaign, under its frequency. Storage can be blocked, then it shows. */
export function promoAlreadySeen(frequency: PromoFrequency, version: string, now = Date.now()): boolean {
  try {
    if (frequency === "every") return false;
    if (frequency === "session") return sessionStorage.getItem(storageKey(version)) !== null;
    const raw = localStorage.getItem(storageKey(version));
    if (raw === null) return false;
    if (frequency === "visitor") return true;
    return now - Number(raw) < DAY_MS;
  } catch {
    return false;
  }
}

export function markPromoSeen(frequency: PromoFrequency, version: string, now = Date.now()) {
  try {
    if (frequency === "session") sessionStorage.setItem(storageKey(version), String(now));
    else if (frequency === "day" || frequency === "visitor") localStorage.setItem(storageKey(version), String(now));
  } catch {
    /* storage unavailable: the in-memory guard still prevents repeats while the tab stays open */
  }
}

/** A link the popup's button may use: the site's own path, or a full web address. */
export const PROMO_URL_PATTERN = /^(\/|https?:\/\/|mailto:|tel:)/i;
