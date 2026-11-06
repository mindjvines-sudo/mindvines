import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Page not found" };

/** Unknown admin addresses get the admin's own 404, behind the same sign-in as every admin page. */
export default function MissingAdminPage() {
  notFound();
}
