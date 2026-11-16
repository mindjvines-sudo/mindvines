import type { Metadata } from "next";
import { withSystemSeo } from "@/lib/cms/system-seo";
import { PageBody } from "@/components/cms/PageBody";
import { getSystemLayout } from "@/lib/cms/public";
import { RenewalFlow } from "@/components/checkout/RenewalFlow";
import { normaliseReference } from "@/lib/renewal";

const baseMetadata: Metadata = {
  title: "Renew a subscription",
  description: "Renew your child's Mindvines subscription, or recover a forgotten registration number by verifying your email.",
  robots: { index: false, follow: true },
};

/** `/renew?ref=MV-7K3Q9P` opens with the registration number filled in (the admin's renewal link). */
export default async function RenewPage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const { ref } = await searchParams;
  const reference = typeof ref === "string" ? normaliseReference(ref) : "";
  const layout = await getSystemLayout("renew");
  if (layout) return <PageBody sections={layout.sections} template={layout.template} ctx={{ pageKey: "renew", ref: reference }} />;
  return <RenewalFlow initialReference={reference} />;
}

export const generateMetadata = (): Promise<Metadata> => withSystemSeo("renew", baseMetadata);
