import type { Metadata } from "next";
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
export const metadata: Metadata = {
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
export default function HomePage() {
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
