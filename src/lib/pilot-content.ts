/** The wording of the public pilot page. Prices are not written here: the plan cards show what the admin has set. */

export const PILOT_HEADING = "The pen pal adventure reimagined for today’s kids";

export const PILOT_LEAD =
  "Registrations are open only for our pilot batch. This is a paid pilot offered at a special discounted fee. Your child joins a small cohort of kids from different cities and shares thoughts through writing and drawing in a journal that travels. Over the pilot, your child picks topics they care about, reads what other kids have written and sketched, and adds their own voice to a growing, shared story. It is a screen-free way to build confidence, creativity and curiosity, while making friends across the country, and seats are limited so that every child gets proper attention.";

export const PILOT_STEPS = [
  { title: "1. Pick topics for the pilot", text: "Choose 10 topics from the curated list to write or draw." },
  { title: "2. A journal comes home", text: "One of the selected topics from the shared writing and sketching journals comes home every 15 days." },
  { title: "3. Keep it for 15 days", text: "Write, draw, read what others wrote, and comment." },
  { title: "4. Pass it on", text: "The journal is collected and moves to the next child." },
];

export const PILOT_FEATURES: { title: string; text: string; wide?: boolean }[] = [
  {
    title: "Who can participate",
    text: "Children aged 6 to 12 years from Bangalore, Hyderabad and Chennai. We are also delighted to have children associated with a prominent pan India based not-for-profit organisation as part of our pilot cohort.",
    wide: true,
  },
  {
    title: "Seat preference",
    text: "We would like to understand whether children aged 9 to 12 enjoy both the sketching and the writing journals. For the pilot, we will give preference to children in this age group who opt for both. If your child cannot be part of the pilot, Mindvines will reach out as soon as regular registrations open.",
    wide: true,
  },
  {
    title: "Duration and start date",
    text: "The pilot runs for 4 months, starting in January 2027. The exact date of commencement will be announced by the second week of December. After the pilot, batch members may be shuffled into new groups.",
    wide: true,
  },
  { title: "Built together", text: "We are shaping Mindvines with the children and parents, and will listen closely to your feedback." },
  {
    title: "Pilot pricing",
    text: "Choose a pilot plan below to see its discounted price. This discounted pilot price continues for as long as you choose to stay with Mindvines.",
  },
  {
    title: "Featuring entries",
    text: "With your consent, we may feature a child’s entries on our website and in our advertising, along with a nickname, school name and city.",
    wide: true,
  },
];

export const PILOT_PLANS_HEADING = "Register for the pilot";
export const PILOT_PLANS_INTRO =
  "Choose a plan, then register your child with the usual form. Seats are limited, and registration is complete once your payment is confirmed.";

export type PilotIntroContent = { heading: string; lead: string; steps: { title: string; text: string }[] };
export type PilotFeaturesContent = { heading: string; items: { title: string; text: string; wide: boolean }[] };
export type PilotPlansContent = { heading: string; intro: string };

export const PILOT_INTRO_DEFAULT: PilotIntroContent = { heading: PILOT_HEADING, lead: PILOT_LEAD, steps: PILOT_STEPS };
export const PILOT_FEATURES_DEFAULT: PilotFeaturesContent = {
  heading: "Features of the pilot",
  items: PILOT_FEATURES.map((feature) => ({ title: feature.title, text: feature.text, wide: Boolean(feature.wide) })),
};
export const PILOT_PLANS_DEFAULT: PilotPlansContent = { heading: PILOT_PLANS_HEADING, intro: PILOT_PLANS_INTRO };
