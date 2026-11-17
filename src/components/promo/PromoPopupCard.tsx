"use client";

import Image from "next/image";
import { useState } from "react";
import type { PromoPopupConfig } from "@/lib/promo-popup";
import { cn } from "@/lib/utils";

/** White text on dark backgrounds, ink on light ones, from the colour the admin picked. */
function isDark(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return false;
  const value = parseInt(match[1], 16);
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

type Props = {
  config: Omit<PromoPopupConfig, "version" | "frequency" | "delaySeconds" | "overlayOpacity"> & Partial<PromoPopupConfig>;
  titleId?: string;
  descriptionId?: string;
  onClose?: () => void;
  /** Called when the image or button is clicked, so the popup can close before the page changes. */
  onNavigate?: () => void;
  /** Called once the image that is showing has loaded (or failed), so the popup can fade in without a jump. */
  onImageSettled?: () => void;
  /** Admin preview: nothing in the card is clickable. */
  inert?: boolean;
};

/**
 * The popup's face, shared by the live site and the admin preview. It lays
 * itself out from its own width (container queries), so the phone layout is
 * a real design, not a shrunken desktop: stacked image and centred text under
 * 36rem, a wider frame and larger type above.
 */
export function PromoPopupCard({ config, titleId, descriptionId, onClose, onNavigate, onImageSettled, inert }: Props) {
  const [failed, setFailed] = useState<{ desktop?: boolean; mobile?: boolean }>({});
  const { desktopImage, mobileImage, title, description, ctaLabel, ctaUrl, backgroundColor } = config;
  const hasText = Boolean(title || description || (ctaLabel && ctaUrl));
  const dark = isDark(backgroundColor);
  const external = /^(https?:|mailto:|tel:)/i.test(ctaUrl);
  const linkProps = { href: ctaUrl || "#", onClick: (event: React.MouseEvent) => { if (inert) event.preventDefault(); else onNavigate?.(); }, ...(external && /^https?:/i.test(ctaUrl) ? { target: "_blank", rel: "noopener noreferrer" } : {}) };
  // An image-only banner with a link is itself the button.
  const imageIsLink = Boolean(ctaUrl) && !ctaLabel;

  const picture = (variant: "mobile" | "desktop") => {
    const image = variant === "mobile" ? mobileImage : desktopImage;
    if (!image || failed[variant]) return null;
    const visible = variant === "mobile" ? "@xl:hidden" : "hidden @xl:block";
    const img = (
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes="(min-width: 576px) 880px, 92vw"
        onLoad={onImageSettled}
        onError={() => { setFailed((current) => ({ ...current, [variant]: true })); onImageSettled?.(); }}
        draggable={false}
        className="block h-auto w-full select-none"
      />
    );
    return imageIsLink ? <a {...linkProps} className={cn("block", visible)}>{img}</a> : <div className={visible}>{img}</div>;
  };

  return (
    <div className="@container w-full">
      <div className={cn("relative overflow-hidden rounded-[20px] shadow-[0_24px_70px_rgba(0,0,0,0.35)] @xl:rounded-[28px]", dark ? "text-white" : "text-ink")} style={{ backgroundColor }}>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-promo-close
            className="absolute right-2.5 top-2.5 z-10 grid size-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white @xl:right-4 @xl:top-4"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 5l14 14M19 5 5 19" /></svg>
          </button>
        )}

        {picture("mobile")}
        {picture("desktop")}

        {hasText && (
          <div className="px-5 pb-6 pt-5 text-center @xl:px-12 @xl:pb-10 @xl:pt-8">
            {title && <h2 id={titleId} className="font-display text-[24px] font-semibold leading-tight text-balance @xl:text-[34px]">{title}</h2>}
            {description && <p id={descriptionId} className={cn("mx-auto max-w-[56ch] text-[15px] leading-relaxed @xl:text-[17px]", title && "mt-2.5 @xl:mt-3")}>{description}</p>}
            {ctaLabel && ctaUrl && (
              <a {...linkProps} className="mt-5 inline-flex h-12 max-w-full items-center justify-center rounded-full border border-b-[3px] border-r-[3px] border-cocoa bg-amber px-8 text-center text-[17px] font-bold text-ink transition-colors hover:bg-[#f5b21c] @xl:mt-6">
                {ctaLabel}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
