import { Suspense } from "react";
import { RenewalFlow } from "@/components/checkout/RenewalFlow";
import { LegalPage } from "@/components/legal/LegalPage";
import { PilotFeatures, PilotIntro, PilotPlans } from "@/components/pilot/PilotSections";
import { RegistrationTypeSwitch } from "@/components/pilot/RegistrationTypeSwitch";
import { SectionRenderer } from "@/components/cms/SectionRenderer";
import { AgeGroups, AgeGroupsLoading } from "@/components/sections/AgeGroups";
import { Contact } from "@/components/sections/Contact";
import { Faq } from "@/components/sections/Faq";
import { FounderNote } from "@/components/sections/FounderNote";
import { Hero } from "@/components/sections/Hero";
import { Journey } from "@/components/sections/Journey";
import { MoreThanJournal } from "@/components/sections/MoreThanJournal";
import { SubscriptionPlans, SubscriptionPlansLoading } from "@/components/sections/SubscriptionPlans";
import { WhatGrows } from "@/components/sections/WhatGrows";
import { LEGAL_DOCUMENTS, type LegalDocument } from "@/lib/legal-content";
import { SUBSCRIPTION_AGE_GROUPS } from "@/lib/subscriptions";
import type { ComponentKey } from "@/lib/cms/components";
import type { AnySection, PageContent } from "@/lib/cms/sections";
import { cn } from "@/lib/utils";

/** What a built-in page knows about the visit, so its functional components behave as they always did. */
export type PageContext = {
  /** The built-in page this is, when it is one. */
  pageKey?: string;
  /** `?age=` on the plans page. */
  age?: string;
  /** `?code=` on the pilot page. */
  code?: string;
  /** `?ref=` on the renewal page. */
  ref?: string;
};

// The content a component receives has been conformed to its built-in shape on the server (conform.ts),
// so these casts only tell TypeScript what that step guarantees.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = any;

function BuiltIn({ component, props, ctx }: { component: ComponentKey; props: Props; ctx: PageContext }) {
  switch (component) {
    case "hero": return <Hero content={props} />;
    case "journey": return <Journey content={props} />;
    case "moreThanJournal": return <MoreThanJournal content={props} />;
    case "whatGrows": return <WhatGrows content={props} />;
    case "ageGroups": return <Suspense fallback={<AgeGroupsLoading />}><AgeGroups /></Suspense>;
    case "founderNote": return <FounderNote content={props} />;
    case "faq": return <Faq content={props} />;
    case "contact": return <Contact content={props} />;
    case "registrationSwitch": return <RegistrationTypeSwitch current={ctx.pageKey === "pilot" ? "pilot" : "standard"} />;
    case "subscriptionPlans": {
      const age = SUBSCRIPTION_AGE_GROUPS.find((option) => option === ctx.age) ?? SUBSCRIPTION_AGE_GROUPS[0];
      return <Suspense fallback={<SubscriptionPlansLoading age={age} content={props} />}><SubscriptionPlans age={age} content={props} /></Suspense>;
    }
    case "pilotIntro": return <PilotIntro content={props} />;
    case "pilotFeatures": return <PilotFeatures content={props} />;
    case "pilotPlans": return <Suspense fallback={null}><PilotPlans code={ctx.code} content={props} /></Suspense>;
    case "renewalFlow": return <RenewalFlow initialReference={ctx.ref ?? ""} />;
    case "legalDocument": {
      const base = LEGAL_DOCUMENTS[(ctx.pageKey as LegalDocument["slug"]) in LEGAL_DOCUMENTS ? (ctx.pageKey as LegalDocument["slug"]) : "terms"];
      return <LegalPage document={{ ...base, title: props.title || base.title, body: props.body ?? base.body }} />;
    }
  }
}

const VISIBILITY = { all: "", desktop: "hidden md:block", mobile: "md:hidden" } as const;

/**
 * A page's sections in order: the builder's own sections, and the site's
 * built-in components. One renderer for custom pages, built-in pages, the
 * preview and the live site, so they can't drift apart.
 */
export function PageBody({ sections, template, ctx = {} }: { sections: AnySection[]; template: PageContent["template"]; ctx?: PageContext }) {
  return (
    <>
      {sections.map((section) => {
        if (section.visible === false) return null;
        if (section.type !== "component") return <SectionRenderer key={section.id} section={section} template={template} />;
        const body = <BuiltIn component={section.data.component} props={section.data.props} ctx={ctx} />;
        const visibility = VISIBILITY[section.style.devices];
        return visibility ? <div key={section.id} className={cn(visibility)}>{body}</div> : <div key={section.id} className="contents">{body}</div>;
      })}
    </>
  );
}

/** For custom pages (they have no built-in context). */
export function PageSections({ sections, template }: { sections: AnySection[]; template: PageContent["template"] }) {
  return <div><PageBody sections={sections} template={template} /></div>;
}
