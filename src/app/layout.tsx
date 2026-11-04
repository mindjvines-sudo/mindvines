import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

// Deliberately bare: fonts, global stylesheets, and body-level layout classes
// live in the (public) and admin layouts instead, so each side's CSS bundle
// only ships to its own routes and the two never fight over shared tokens
// (see src/app/(public)/globals.css and src/app/admin/globals.css).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <head>
        {/*
          Public-site scroll reveals (components/animations/Reveal.tsx) start
          at opacity 0 and are resolved by JS. Without JS that content would
          never appear, so force it visible. Harmless on admin routes, which
          never set data-reveal.
        */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
