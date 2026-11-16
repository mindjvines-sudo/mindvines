/**
 * The site's built-in components, as the page builder sees them.
 *
 * A "component" section is one of the site's existing, hand-built sections (the
 * home page's hero, the pilot plan cards, the legal text...) whose *content* an
 * admin can edit and whose place on the page they can change. The component
 * itself stays in code, so anything functional (plans from the subscription
 * backend, pilot slots, the registration and payment links, the contact form)
 * keeps working: only the words, pictures, order and visibility are the CMS's.
 *
 * `defaults()` is also the shape stored content must conform to, so a
 * component can never be handed something it can't draw.
 */
import { CONTACT, FAQ, FOUNDER_NOTE, HERO, JOURNEY, MORE_THAN_JOURNAL, WHAT_GROWS } from "@/lib/content";
import { LEGAL_DOCUMENTS } from "@/lib/legal-content";
import { PILOT_FEATURES_DEFAULT, PILOT_INTRO_DEFAULT, PILOT_PLANS_DEFAULT } from "@/lib/pilot-content";
import type { SystemPageKey } from "@/lib/cms/reserved";

export const COMPONENT_KEYS = [
  "hero", "journey", "moreThanJournal", "whatGrows", "ageGroups", "founderNote", "faq", "contact",
  "registrationSwitch", "subscriptionPlans", "pilotIntro", "pilotFeatures", "pilotPlans", "renewalFlow", "legalDocument",
] as const;
export type ComponentKey = (typeof COMPONENT_KEYS)[number];

type Props = Record<string, unknown>;

/** The founder's note marks emphasis per run; every run states both flags so the editor can show them. */
const founderNote = () => ({
  heading: FOUNDER_NOTE.heading,
  paragraphs: FOUNDER_NOTE.paragraphs.map((runs) => runs.map((run) => ({ text: run.text, accent: "accent" in run && Boolean(run.accent), italic: "italic" in run && Boolean(run.italic) }))),
  signOff: FOUNDER_NOTE.signOff.map((runs) => runs.map((run) => ({ text: run.text, accent: "accent" in run && Boolean(run.accent), italic: "italic" in run && Boolean(run.italic) }))),
  author: { ...FOUNDER_NOTE.author },
});

const legal = (slug: keyof typeof LEGAL_DOCUMENTS) => ({ title: LEGAL_DOCUMENTS[slug].title, body: LEGAL_DOCUMENTS[slug].body.trim() });

export type ComponentMeta = {
  label: string;
  hint: string;
  /** Drawn from live data: its content here is only the words around it. */
  functional: boolean;
  /** Where the admin may add it (the page it was built for, or anywhere). */
  pages: "any" | SystemPageKey[];
  /** At most one per page. */
  single: boolean;
  /** Shown in the editor above the content fields. */
  note?: string;
  defaults: () => Props;
};

export const COMPONENTS: Record<ComponentKey, ComponentMeta> = {
  hero: { label: "Home hero", hint: "Badge, heading, picture and button", functional: false, pages: ["home"], single: true, defaults: () => structuredClone(HERO) as Props },
  journey: { label: "Journey steps", hint: "The five-step board", functional: false, pages: ["home"], single: true, defaults: () => structuredClone(JOURNEY) as Props },
  moreThanJournal: { label: "More than a journal", hint: "Four feature cards", functional: false, pages: ["home"], single: true, defaults: () => structuredClone(MORE_THAN_JOURNAL) as Props },
  whatGrows: { label: "What grows", hint: "Three benefit cards", functional: false, pages: ["home"], single: true, defaults: () => structuredClone(WHAT_GROWS) as Props },
  ageGroups: { label: "Age groups", hint: "Cards linking to each age group's page", functional: true, pages: ["home"], single: true, note: "The cards and their heading are managed in Age Groups, so they always match the age group pages. Here you choose where this section appears, and whether it shows.", defaults: () => ({}) },
  founderNote: { label: "Founder's note", hint: "The letter on notebook paper", functional: false, pages: ["home"], single: true, defaults: founderNote },
  faq: { label: "FAQ (site style)", hint: "Question and answer rows", functional: false, pages: "any", single: false, defaults: () => structuredClone(FAQ) as Props },
  contact: { label: "Contact & form", hint: "Contact details and the enquiry form", functional: true, pages: "any", single: true, note: "The enquiry form keeps sending to the same place; you can edit the headings around it. Email and phone come from site settings.", defaults: () => ({ heading: CONTACT.heading, formHeading: CONTACT.formHeading }) },
  registrationSwitch: { label: "Registration type switch", hint: "Standard / Pilot toggle", functional: true, pages: ["subscriptions", "pilot"], single: true, note: "Fixed navigation between the two ways to register.", defaults: () => ({}) },
  subscriptionPlans: { label: "Subscription plans", hint: "Live plans by age group", functional: true, pages: ["subscriptions"], single: true, note: "Plans, prices and buttons always come from Subscription Plans. Here you edit the heading and introduction.", defaults: () => ({ title: "Subscription plans", intro: "Choose a journal journey for your child. A little time to write, sketch, and discover a different point of view." }) },
  pilotIntro: { label: "Pilot introduction", hint: "Heading, lead and four steps", functional: false, pages: ["pilot"], single: true, defaults: () => structuredClone(PILOT_INTRO_DEFAULT) as Props },
  pilotFeatures: { label: "Pilot features", hint: "Feature cards", functional: false, pages: ["pilot"], single: true, defaults: () => structuredClone(PILOT_FEATURES_DEFAULT) as Props },
  pilotPlans: { label: "Pilot plans & registration", hint: "Live pilot plans, slots and access code", functional: true, pages: ["pilot"], single: true, note: "Plans, prices, seats, access codes and registration always come from Pilot Registration. Here you edit the heading and introduction.", defaults: () => structuredClone(PILOT_PLANS_DEFAULT) as Props },
  renewalFlow: { label: "Renewal form", hint: "Look up and renew a subscription", functional: true, pages: ["renew"], single: true, note: "The renewal and payment flow is fixed. Add sections above or below it for extra information.", defaults: () => ({}) },
  legalDocument: { label: "Legal text", hint: "A policy document", functional: false, pages: ["terms", "refund-policy", "privacy-policy"], single: true, note: "Use ## for a numbered heading, ### for a sub-heading, - for list items, and a blank line between paragraphs.", defaults: () => ({ title: "", body: "" }) },
};

export const COMPONENT_LABELS = Object.fromEntries(COMPONENT_KEYS.map((key) => [key, COMPONENTS[key].label])) as Record<ComponentKey, string>;

/** Defaults for a component on a given page (the legal text differs per page). */
export function componentDefaults(key: ComponentKey, page?: string): Props {
  if (key === "legalDocument" && page && page in LEGAL_DOCUMENTS) return legal(page as keyof typeof LEGAL_DOCUMENTS);
  return COMPONENTS[key].defaults();
}

export const componentAllowedOn = (key: ComponentKey, page: string) => COMPONENTS[key].pages === "any" || (COMPONENTS[key].pages as string[]).includes(page);

/** Each built-in page, top to bottom, exactly as it is laid out in code today. */
export const SYSTEM_LAYOUTS: Record<SystemPageKey, ComponentKey[]> = {
  home: ["hero", "journey", "moreThanJournal", "whatGrows", "ageGroups", "founderNote", "faq", "contact"],
  subscriptions: ["registrationSwitch", "subscriptionPlans"],
  pilot: ["registrationSwitch", "pilotIntro", "pilotFeatures", "pilotPlans"],
  renew: ["renewalFlow"],
  terms: ["legalDocument"],
  "refund-policy": ["legalDocument"],
  "privacy-policy": ["legalDocument"],
};
