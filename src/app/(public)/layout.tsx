import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Fredoka, Nunito_Sans, Onest } from "next/font/google";
import { connection } from "next/server";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HERO, HOME_SEO, SITE, buildMenu } from "@/lib/content";
import { listAgeGroupPagesByPlanAge } from "@/services/age-group.service";

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
    default: HOME_SEO.title,
    template: `%s | ${SITE.name}`,
  },
  description: HOME_SEO.description,
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
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    images: [{ url: HERO.image.src, width: HERO.image.width, height: HERO.image.height, alt: SITE.tagline }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_SEO.title,
    description: HOME_SEO.description,
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
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // The menu links to whichever age group pages are published; without the
  // database it still shows, minus the topic links.
  await connection();
  const agePages = await listAgeGroupPagesByPlanAge().catch(() => []);

  return (
    <div className={`${fredoka.variable} ${nunitoSans.variable} ${onest.variable} ${bricolage.variable} font-sans antialiased`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-amber focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink"
      >
        Skip to content
      </a>
      <Header menu={buildMenu(agePages)} />
      <main id="main">{children}</main>
      <Footer />
    </div>
  );
}
