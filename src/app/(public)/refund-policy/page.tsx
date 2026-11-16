import type { Metadata } from "next";
import { withSystemSeo } from "@/lib/cms/system-seo";
import { PageBody } from "@/components/cms/PageBody";
import { getSystemLayout } from "@/lib/cms/public";
import { LegalPage } from "@/components/legal/LegalPage";
import { LEGAL_DOCUMENTS } from "@/lib/legal-content";

const document = LEGAL_DOCUMENTS["refund-policy"];

const baseMetadata: Metadata = {
  title: document.title,
  description: document.description,
  alternates: { canonical: "/refund-policy" },
};

export default async function Page() {
  const layout = await getSystemLayout("refund-policy");
  if (layout) return <PageBody sections={layout.sections} template={layout.template} ctx={{ pageKey: "refund-policy" }} />;
  return <LegalPage document={document} />;
}

export const generateMetadata = (): Promise<Metadata> => withSystemSeo("refund-policy", baseMetadata);
