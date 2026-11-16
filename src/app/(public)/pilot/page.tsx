import type { Metadata } from "next";
import { withSystemSeo } from "@/lib/cms/system-seo";
import { connection } from "next/server";
import { PageBody } from "@/components/cms/PageBody";
import { PilotFeatures, PilotIntro, PilotPlans } from "@/components/pilot/PilotSections";
import { RegistrationTypeSwitch } from "@/components/pilot/RegistrationTypeSwitch";
import { getSystemLayout } from "@/lib/cms/public";

const baseMetadata: Metadata = { title: "Pilot Registration", robots: { index: false, follow: false } };

/**
 * Pilot offers. The page is made of the same components whether it is drawn
 * from its built-in layout or one published in Admin → Pages; the plans, slots,
 * access codes and registration links always come from the pilot backend.
 */
export default async function PilotPage({ searchParams }: { searchParams: Promise<{ code?: string | string[] }> }) {
  await connection();
  const { code: rawCode } = await searchParams;
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode)?.trim().slice(0, 40);

  const layout = await getSystemLayout("pilot");
  if (layout) return <PageBody sections={layout.sections} template={layout.template} ctx={{ pageKey: "pilot", code }} />;

  return (
    <>
      <RegistrationTypeSwitch current="pilot" />
      <PilotIntro />
      <PilotFeatures />
      <PilotPlans code={code} />
    </>
  );
}

export const generateMetadata = (): Promise<Metadata> => withSystemSeo("pilot", baseMetadata);
