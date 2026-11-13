import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_DOCUMENTS } from "@/lib/legal-content";

const document = LEGAL_DOCUMENTS["privacy-policy"];

export const metadata: Metadata = {
  title: document.title,
  description: document.description,
  alternates: { canonical: "/privacy-policy" },
};

export default function Page() {
  return <LegalPage document={document} />;
}
