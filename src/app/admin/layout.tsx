import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-admin-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { template: "%s · Mindvines Admin", default: "Mindvines Admin" },
  robots: { index: false, follow: false },
};

// Sets shared admin metadata (no-index), the Inter UI font, and the
// admin-only stylesheet (./globals.css, not loaded on public routes). Auth is
// enforced in the (protected) route group's layout, not here — this layout
// also wraps /admin/login, which must stay reachable when signed out.
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className={`${inter.variable} font-sans text-slate-900 antialiased`}>{children}</div>;
}
