/**
 * Copy and assets for the public site, transcribed from mindvines.in.
 * The site is a single scrolling page; section ids below are the anchors
 * the menu links to.
 */

/** Pages that live on the current Wix site and have no counterpart here yet. */
const LIVE = "https://www.mindvines.in";

export const SITE = {
  name: "Mindvines",
  tagline: "A shared journal programme for ages 6-12",
  description:
    "Mindvines is a shared journal programme for children aged 6-12. Choose a topic, write or sketch your thoughts, and discover how children across India see it differently.",
  url: "https://www.mindvines.in",
  email: "info@mindvines.in",
  phone: "+91-9176001899",
  logo: { src: "/images/logo.png", width: 518, height: 174 },
} as const;

export const SECTION_IDS = {
  howItWorks: "how-it-works",
  ageGroups: "age-groups",
  faq: "faq",
  contact: "contact",
} as const;

export const REGISTER_HREF = `${LIVE}/blank-7`;

/** A menu entry is either a link or a group that expands to show its links. */
export type MenuItem =
  | { label: string; href: string; children?: never }
  | { label: string; href?: never; children: { label: string; href: string }[] };

export const MENU: MenuItem[] = [
  { label: "How it Works", href: `#${SECTION_IDS.howItWorks}` },
  {
    label: "A Glimpse of few topics",
    children: [
      { label: "Ages 6-8 yrs", href: `${LIVE}/blank-5` },
      { label: "Ages 9-12 yrs", href: `${LIVE}/blank-5-1-1` },
    ],
  },
  {
    label: "Subscription plans",
    children: [
      { label: "Ages 6-8", href: `${LIVE}/blank-5#ages-6-8` },
      { label: "Ages 9-12", href: `${LIVE}/blank-5-1-1#ages-9-12` },
    ],
  },
  { label: "FAQ", href: `#${SECTION_IDS.faq}` },
  { label: "Contact us", href: `#${SECTION_IDS.contact}` },
  { label: "Registration", href: `${LIVE}/blank-6` },
];

export const HERO = {
  badge: "A shared journal programme for ages 6-12",
  heading: "Children across India, meeting each other",
  accent: "on paper",
  body: "Choose a topic. Write or sketch your thoughts. Discover how children across India see it differently. Or exactly the same.",
  cta: { label: "Register your child", href: REGISTER_HREF },
  image: {
    src: "/images/hero-journal.png",
    width: 1358,
    height: 1069,
    alt: "An orange Mindvines journal linked to children's names in Bengaluru, Ahmedabad, Pune, Jaipur, Delhi, Chennai, Mumbai, Kolkata and Kochi",
  },
} as const;

export type JourneyStep = {
  number: number;
  title: string;
  body: string;
  icon: { src: string; width: number; height: number };
};

export const JOURNEY = {
  heading: "Journey with Mindvines",
  steps: [
    {
      number: 1,
      title: "Choose a plan",
      body: "And be part of a cohort with children from 3+ cities",
      icon: { src: "/images/step-plan.webp", width: 394, height: 278 },
    },
    {
      number: 2,
      title: "Pick topics of interest",
      body: "Choose at the time of registration",
      icon: { src: "/images/step-topics.webp", width: 240, height: 186 },
    },
    {
      number: 3,
      title: "Journal arrives home",
      body: 'Often holding entries. Or be a "Founding Writer" or "Founding Artist" and set the ball rolling on a new topic',
      icon: { src: "/images/step-journal.webp", width: 296, height: 278 },
    },
    {
      number: 4,
      title: "Add your voice",
      body: "14 days to write, sketch or do both",
      icon: { src: "/images/step-voice.webp", width: 226, height: 256 },
    },
    {
      number: 5,
      title: "Say something back",
      body: "A note about a peer's page. Cheer them on",
      icon: { src: "/images/step-reply.webp", width: 292, height: 342 },
    },
  ] satisfies JourneyStep[],
  finale: {
    text: "And it moves on to the next child",
    image: { src: "/images/next-child.webp", width: 244, height: 288 },
  },
} as const;

export const MORE_THAN_JOURNAL = {
  heading: "More than just a journal",
  cohort: {
    title: "Getting to know your cohort",
    body: "Same names, from 3+ cities across India, show up journal after journal.",
    note: "Your child gets a real sense of who's on the other side of the page!",
    image: { src: "/images/cohort-map.png", width: 634, height: 506, alt: "Sketch map of children in Mumbai, Delhi, Bengaluru, Kolkata and Kochi" },
  },
  perspectives: {
    title: "Wide perspectives for each topic",
    body: "Every entry is a fresh take on the same topic expressed through writing or sketching.",
    accent: "A unique version each time.",
  },
  reviewed: {
    title: "Every entry reviewed",
    body: "Our team checks every page before another child sees it",
    image: { src: "/images/reviewed-stamp.png", width: 158, height: 152 },
  },
  physical: {
    title: "Physical first",
    body: "A real journal your child holds, fills, and passes on.",
    image: { src: "/images/physical-first.png", width: 464, height: 370, alt: "A boy reading an orange Mindvines journal at his desk" },
    cta: { label: "Get started", href: REGISTER_HREF },
  },
} as const;

export const WHAT_GROWS = {
  heading: "What grows along the way",
  subheading: "A little more than writing and drawing",
  items: [
    {
      title: "Finding their own voice",
      body: "With time to pause, think and respond, children practise putting their thoughts into words or sketches, in their own way",
    },
    {
      title: "Seeing things differently",
      body: "One topic can bring many different responses. Seeing what other children create shows them how differently the same thing can be seen.",
    },
    {
      title: "Creating for a real audience",
      body: "Their writing and sketches travel to other children who read them, respond to them and sometimes find inspiration in them.",
    },
  ],
} as const;

export const AGE_GROUPS = {
  heading: "Two age groups",
  groups: [
    {
      title: "Ages 6–8",
      subtitle: "Sketching journals",
      body: "At this age, drawing is a joyful way to explore a shared topic. Let the sketches flow, one topic at a time.",
      href: `${LIVE}/blank-5`,
      image: { src: "/images/ages-6-8.png", width: 736, height: 724, alt: "A child colouring with a red pencil" },
    },
    {
      title: "Ages 9–12",
      subtitle: "Writing and Sketching journals",
      body: "Choose writing journals, sketching journals, or both. Every journal revolves around one shared topic.",
      href: `${LIVE}/blank-5-1-1`,
      image: { src: "/images/ages-9-12.png", width: 728, height: 690, alt: "A child writing in a lined journal" },
    },
  ],
} as const;

/**
 * Each paragraph is a list of runs; `accent` runs render in the tan
 * highlight the founder's note uses for its key lines.
 */
type NoteRun = { text: string; accent?: boolean; italic?: boolean };

export const FOUNDER_NOTE: {
  heading: string;
  paragraphs: NoteRun[][];
  signOff: NoteRun[][];
  author: { name: string; role: string };
} = {
  heading: "Founder's Note",
  paragraphs: [
    [
      {
        text: "When I was a child, I was intrigued by the idea of a pen pal. Exchanging little pieces of your world with someone you have never met. There was something quietly magical about it. A faraway stranger reading your thoughts. You reading theirs. No two people seeing the same thing the same way.",
      },
    ],
    [
      { text: "As a parent, I began wondering: " },
      { text: "could we bring some of that magic into the lives of our children?", accent: true },
    ],
    [
      {
        text: "The internet makes it easy to connect with anyone instantly. But, is faster always better, especially for children? Maybe some of what made a pen pal special wasn't the speed, but the exact opposite of it; ",
      },
      {
        text: "a friendship blossoming slowly, pausing and reflecting before expressing, and the excitement of discovering how someone in another part of the country thinks.",
        accent: true,
      },
    ],
    [
      {
        text: "That thought became Mindvines, a name my 11-year-old daughter suggested, because ideas, like vines, grow by reaching toward one another.",
      },
    ],
    [
      {
        text: "We tested the idea with a small group of children. Their responses surprised us, challenged some of our assumptions and helped us reshape the programme.",
      },
    ],
    [
      {
        text: "We don’t know which topics will spark the biggest discussions, which sketches will inspire new ones, or which connections will emerge along the way.",
      },
    ],
    [{ text: "And that’s the part I’m most looking forward to." }],
  ],
  signOff: [
    [{ text: "Every child contributes. Every journal takes a journey.", accent: true }],
    [{ text: "And every stop adds a story.", accent: true, italic: true }],
  ],
  author: { name: "Jitha Muralikrishnan", role: "Founder - Mindvines" },
};

export const FAQ = {
  heading: "Common Questions",
  items: [
    {
      question: "What exactly is Mindvines?",
      answer:
        "Mindvines is a shared journal programme where physical journals, each centred on a unique topic for writing or sketching, travel from child to child. Children see what others have written or drawn, add their own contribution, and then the journal moves on to another child. Over time, a single journal becomes a collection of different voices or sketches on the same topic.",
    },
    {
      question: "Which age groups can join?",
      answer:
        "There are two age groups - 6 to 8 years and 9 to 12 years. Right on the boundary? Go with whichever feels like the better fit for your child. 6 - 8 years can opt for Sketching alone, while 9-12 years can choose Writing, Sketching or both.",
    },
    {
      question: "How does the subscription work, and what's included?",
      answer:
        "Mindvines offers subscription plans for ages 6 to 12. Each journal arrives with previous entries on that topic already printed inside, plus blank A5 sheets for your child to write or sketch on. Doorstep pickup and delivery happen every 15 days, at no extra cost.",
    },
    {
      question: "Who picks the topics?",
      answer:
        "Your child does! At registration, your child selects 10 preferred topics from the list. Six topics will be sent during the quarter, while the remaining preferences are carried forward, along with an updated set of topics to choose from.",
    },
    {
      question: "Will every topic already have entries in it when my child receives the journal?",
      answer:
        'Often, yes — but not always. Sometimes your child will be among the first to write on a topic, which comes with its own kind of fun. Kids who start a new topic are called "Founding Writers" or "Founding Artists."',
    },
    {
      question: "What if my child wants to revisit a topic to read new entries or peer comments?",
      answer:
        "Just send us a WhatsApp message and we'll deliver that topic's journal alongside the next set. One extra journal can be requested per cycle, and it's collected back at the next delivery — free for the first year.",
    },
    {
      question: "How is my child's work shared?",
      answer:
        "Your child signs their entries with a nickname chosen at registration. Every entry is reviewed by our team before it reaches another child, and it is shared within your child's own cohort.",
    },
    {
      question: "What if my child accidentally damages the journal?",
      answer:
        "We've got it covered. There's no cost to you for now. If this ever changes, we'll let every family know clearly in advance.",
    },
  ],
} as const;

export const CONTACT = {
  heading: "Get in Touch!",
  formHeading: "Let's Connect",
  form: {
    name: "First name",
    childAge: "Child's age",
    email: "Email",
    phone: "Phone",
    message: "Message",
    submit: "Submit",
    success: "Thanks for submitting! We'll be in touch soon.",
  },
} as const;

export const FOOTER_LINKS = [
  { label: "Terms and Conditions", href: `${LIVE}/blank-3` },
  { label: "Refund and Cancellation Policy", href: `${LIVE}/blank-2` },
  { label: "Privacy Policy", href: `${LIVE}/blank-4` },
] as const;
