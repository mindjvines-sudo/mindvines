import type { Metadata } from "next";
import { withSystemSeo } from "@/lib/cms/system-seo";
import { PageBody } from "@/components/cms/PageBody";
import { getSystemLayout } from "@/lib/cms/public";
import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { AgeGroups, AgeGroupsLoading } from "@/components/sections/AgeGroups";
import { Contact } from "@/components/sections/Contact";
import { Faq } from "@/components/sections/Faq";
import { FounderNote } from "@/components/sections/FounderNote";
import { Hero } from "@/components/sections/Hero";
import { Journey } from "@/components/sections/Journey";
import { MoreThanJournal } from "@/components/sections/MoreThanJournal";
import { WhatGrows } from "@/components/sections/WhatGrows";
import { FAQ, HOME_SEO, SITE } from "@/lib/content";

// The title is the whole title: the layout's "| Mindvines" suffix would repeat the brand.
const baseMetadata: Metadata = {
  ...buildMetadata({ canonical: siteConfig.url }, { title: HOME_SEO.title, description: HOME_SEO.description }),
  title: { absolute: HOME_SEO.title },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    email: SITE.email,
    telephone: SITE.phone,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  },
];

/** Section order follows mindvines.in top to bottom. */
export default async function HomePage() {
  // A layout published in Admin → Pages replaces the built-in one; without it (or if it can't be read) the built-in page shows.
  const layout = await getSystemLayout("home");
  if (layout) {
    const faq = layout.sections.find((section) => section.type === "component" && section.data.component === "faq");
    const items = faq && faq.type === "component" ? ((faq.data.props.items as { question: string; answer: string }[]) ?? []) : [];
    const published = [...jsonLd.slice(0, 2), { ...jsonLd[2], mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }];
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(items.length ? published : jsonLd.slice(0, 2)).replace(/</g, "\\u003c") }} />
        <PageBody sections={layout.sections} template={layout.template} ctx={{ pageKey: "home" }} />
      </>
    );
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Hero />
      <Journey />
      <MoreThanJournal />
      <WhatGrows />
      <Suspense fallback={<AgeGroupsLoading />}><AgeGroups /></Suspense>
      <FounderNote />
      <Faq />
      <Contact />
    </>
  );
}

export const generateMetadata = (): Promise<Metadata> => withSystemSeo("home", baseMetadata);
