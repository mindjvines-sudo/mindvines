import type { Metadata } from "next";
import { RenewalFlow } from "@/components/checkout/RenewalFlow";
import { normaliseReference } from "@/lib/renewal";

export const metadata: Metadata = {
  title: "Renew a subscription",
  description: "Renew your child's Mindvines subscription, or recover a forgotten registration number by verifying your email.",
  robots: { index: false, follow: true },
};

/** `/renew?ref=MV-7K3Q9P` opens with the registration number filled in (the admin's renewal link). */
export default async function RenewPage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const { ref } = await searchParams;
  const reference = typeof ref === "string" ? normaliseReference(ref) : "";
  return <RenewalFlow initialReference={reference} />;
}
