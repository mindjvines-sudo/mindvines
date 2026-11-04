import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Fredoka, Nunito_Sans, Onest } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HERO, SITE } from "@/lib/content";

import "./globals.css";

/** Stand-in for the live site's VAG Rounded Next headings. */
const fredoka = Fredoka({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fredoka",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-nunito-sans",
});

/** Menu drawer and contact form. */
const onest = Onest({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-onest",
});

/** Badges on the age group pages. */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: "700",
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "shared journal",
    "journal programme for kids",
    "pen pal for children",
    "writing for kids",
    "sketching for kids",
    "children India",
  ],
  authors: [{ name: SITE.name }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: HERO.image.src, width: HERO.image.width, height: HERO.image.height, alt: SITE.tagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [HERO.image.src],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#fcf5e5",
  width: "device-width",
  initialScale: 1,
};

// Fonts, the public-only stylesheet (./globals.css, not loaded on admin
// routes), and the marketing header/footer live here instead of the shared
// root layout, so admin pages never inherit this site's fonts, tokens, or
// chrome. See src/app/layout.tsx for why the split works.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fredoka.variable} ${nunitoSans.variable} ${onest.variable} ${bricolage.variable} font-sans antialiased`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-amber focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
