import { notFound } from "next/navigation";

/**
 * Any address no other route matches lands here, so the 404 renders inside
 * the public layout (header, footer, fonts and styles) rather than as the
 * bare root fallback.
 */
export default function MissingPage() {
  notFound();
}
