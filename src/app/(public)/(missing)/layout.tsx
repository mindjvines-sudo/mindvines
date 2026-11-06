import type { Metadata } from "next";

/** Titles the 404 for unknown addresses: a page that calls notFound() doesn't contribute its own metadata. */
export const metadata: Metadata = { title: "Page not found" };

export default function MissingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
