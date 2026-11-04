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
import { FAQ, SITE } from "@/lib/content";

export const metadata: Metadata = buildMetadata(
  { canonical: siteConfig.url },
  { title: `${siteConfig.name} — ${siteConfig.tagline}`, description: siteConfig.description }
);

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
      <Suspense fallback={<AgeGroupsLoading anchor={false} />}><AgeGroups anchor={false} /></Suspense>
      <Faq />
      <Contact />
    </>
  );
}
