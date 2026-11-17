import "server-only";
import { connectToDatabase } from "@/lib/mongodb";
import { siteConfig } from "@/config/site";
import { SiteSettings } from "@/models/SiteSettings";
import "@/models/Media";
import { asPopulatedMedia } from "@/types/media";
import type { PromoFrequency, PromoImage, PromoPopupConfig } from "@/lib/promo-popup";

/** The popup as the admin edits it: dates and images included, whether or not it is live. */
export type PromoPopupAdmin = Omit<PromoPopupConfig, "desktopImage" | "mobileImage"> & {
  enabled: boolean;
  desktopImage: (PromoImage & { id: string }) | null;
  mobileImage: (PromoImage & { id: string }) | null;
  startsAt: string | null;
  endsAt: string | null;
};

export const PROMO_DEFAULTS = {
  enabled: false, title: "", description: "", ctaLabel: "", ctaUrl: "", backgroundColor: "#fcf8f1", overlayOpacity: 60,
  delaySeconds: 3, frequency: "session" as PromoFrequency, version: "1",
};

function image(value: unknown, fallbackAlt: string): (PromoImage & { id: string }) | null {
  const media = asPopulatedMedia(value);
  if (!media) return null;
  const id = (value as { _id?: { toString(): string } })._id?.toString() ?? "";
  return { id, src: media.secureUrl, width: media.width ?? 1200, height: media.height ?? 800, alt: media.altText?.trim() || fallbackAlt };
}

async function loadRaw() {
  await connectToDatabase();
  return SiteSettings.findOne().select("promoPopup").populate("promoPopup.desktopImage").populate("promoPopup.mobileImage").lean();
}

export async function getPromoPopupForAdmin(): Promise<PromoPopupAdmin> {
  const popup = (await loadRaw())?.promoPopup;
  return {
    ...PROMO_DEFAULTS,
    ...(popup ? {
      enabled: popup.enabled ?? false, title: popup.title ?? "", description: popup.description ?? "", ctaLabel: popup.ctaLabel ?? "", ctaUrl: popup.ctaUrl ?? "",
      backgroundColor: popup.backgroundColor ?? PROMO_DEFAULTS.backgroundColor, overlayOpacity: popup.overlayOpacity ?? 60, delaySeconds: popup.delaySeconds ?? 3,
      frequency: (popup.frequency ?? "session") as PromoFrequency, version: popup.version ?? "1",
    } : {}),
    desktopImage: image(popup?.desktopImage, popup?.title || "Promotion"),
    mobileImage: image(popup?.mobileImage, popup?.title || "Promotion"),
    startsAt: popup?.startsAt ? new Date(popup.startsAt).toISOString() : null,
    endsAt: popup?.endsAt ? new Date(popup.endsAt).toISOString() : null,
  };
}

/** The campaign to show right now, or null: switched off, outside its dates, or with nothing to show. */
export async function getActivePromoPopup(now = new Date()): Promise<PromoPopupConfig | null> {
  const popup = (await loadRaw())?.promoPopup;
  if (!popup?.enabled) return null;
  if (popup.startsAt && now < new Date(popup.startsAt)) return null;
  if (popup.endsAt && now > new Date(popup.endsAt)) return null;
  const alt = popup.title || "Promotion";
  const desktop = image(popup.desktopImage, alt);
  const mobile = image(popup.mobileImage, alt);
  const strip = (value: PromoImage & { id: string }): PromoImage => ({ src: value.src, width: value.width, height: value.height, alt: value.alt });
  const config: PromoPopupConfig = {
    version: popup.version ?? "1",
    // Either image stands in for the other when only one was uploaded.
    desktopImage: desktop ? strip(desktop) : mobile ? strip(mobile) : null,
    mobileImage: mobile ? strip(mobile) : desktop ? strip(desktop) : null,
    title: popup.title ?? "", description: popup.description ?? "", ctaLabel: popup.ctaLabel ?? "", ctaUrl: popup.ctaUrl ?? "",
    backgroundColor: popup.backgroundColor ?? PROMO_DEFAULTS.backgroundColor, overlayOpacity: popup.overlayOpacity ?? 60,
    delaySeconds: popup.delaySeconds ?? 3, frequency: (popup.frequency ?? "session") as PromoFrequency,
  };
  return config.desktopImage || config.title || config.description ? config : null;
}

export async function savePromoPopup(input: {
  enabled: boolean; desktopImage?: string; mobileImage?: string; title: string; description: string; ctaLabel: string; ctaUrl: string;
  backgroundColor: string; overlayOpacity: number; delaySeconds: number; frequency: PromoFrequency; startsAt: Date | null; endsAt: Date | null; relaunch: boolean;
}, userId: string) {
  await connectToDatabase();
  const current = (await SiteSettings.findOne().select("promoPopup.version").lean())?.promoPopup?.version;
  const { relaunch, ...rest } = input;
  const version = relaunch || !current ? Date.now().toString(36) : current;
  return SiteSettings.findOneAndUpdate(
    {},
    {
      $set: { promoPopup: { ...rest, desktopImage: rest.desktopImage || undefined, mobileImage: rest.mobileImage || undefined, startsAt: rest.startsAt ?? undefined, endsAt: rest.endsAt ?? undefined, version }, updatedBy: userId },
      $setOnInsert: { siteName: siteConfig.name, tagline: siteConfig.tagline },
    },
    { new: true, upsert: true }
  );
}
