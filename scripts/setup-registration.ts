import path from "node:path";
import mongoose from "mongoose";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(path.resolve(process.cwd()));

/**
 * Sets up registration data and brings older records in line. Safe to run
 * again; it only fills in what is missing:
 *  - the three topic categories, and a live topic set ("version") holding
 *    Mindvines' starting topics;
 *  - topics saved before categories existed, moved into them;
 *  - the four programmes, and each plan linked to its programme.
 * Everything can be changed afterwards in the admin.
 */
const DRAW = "Choose the 10 topics your child would most like to draw. The selection will be refreshed every quarter, with some familiar favourites and some new topics to choose from.";
const WRITE = "Choose the 10 topics your child would most like to write about. The selection will be refreshed every quarter, with some familiar favourites and some new topics to choose from.";

const CATEGORIES = [
  {
    key: "SKETCH_1",
    legacy: { ageGroup: "6-8", kind: "SKETCHING" },
    name: "Sketching Topics – Category 1",
    heading: "Pick your favourite 10 sketching topics",
    description: DRAW,
    titles: [
      "My Favourite Fictional Character", "Under the Sea", "My Own Superhero Costume", "A Colourful Ice Cream Cone",
      "My Favourite Animal Doing Something Silly", "The School Bus", "A Magical Tree", "Wacky Rainbow with Different Doodles in Each Colour",
      "My Sports Hero", "An Upside-Down House", "Kites", "A Friendly Monster", "Design Your Dream Vehicle", "Butterflies",
      "A Beautiful Nature Scene", "Diyas for Diwali", "Design a Handbag for Someone You Love", "Me as a Grown-Up Doing My Dream Job",
    ],
  },
  {
    key: "WRITING",
    legacy: { ageGroup: "9-12", kind: "WRITING" },
    name: "Writing Topics",
    heading: "Pick your 10 favourite writing topics",
    description: WRITE,
    titles: [
      "A Fictional Character That I Love", "Video Games I Love to Play", "My Favourite IPL Team", "A Movie or Show That I Love",
      "Books That I Loved Reading", "A Place I Loved Visiting", "My Cooking Experiments", "A Funny Incident at School",
      "Best Ways to Kill Time", "Meet Me (Introduce Yourself in Your Unique Way)", "If I Had Rs.1 Crore, How Would I Spend It?",
      "My Business Idea", "A Story That Begins With \"I Knew I Shouldn't Have Opened It\"", "The Best Gift I Have Ever Given Someone",
      "Someone I Admire Who Isn't Famous", "If I Could Go Back to Any Time or Moment in History",
    ],
  },
  {
    key: "SKETCH_2",
    legacy: { ageGroup: "9-12", kind: "SKETCHING" },
    name: "Sketching Topics – Category 2",
    heading: "Pick your 10 favourite sketching topics",
    description: DRAW,
    titles: [
      "Anime or Manga Character", "A Creature Invented by You", "Floral Art", "Your Nickname in Doodle Art", "The Night Sky and You",
      "An Animal Wearing Clothes or Accessories", "Design Your Own Sneaker", "Dancing in the Rain", "Creative Eye Art", "Me and My Robot",
      "Four Seasons in One Frame", "An Athlete Playing Their Favourite Sport", "A Christmas Scene",
      "A Tattoo You Would Design for Yourself Someday", "Owl Art", "Madhubani-Inspired Fish", "Rangoli / Kolam", "Ganesha",
    ],
  },
] as const;

const PROGRAMMES = [
  { ageGroup: "6-8", name: "Sketching", description: "Sketching journals for ages 6–8.", categories: ["SKETCH_1"], displayOrder: 0 },
  { ageGroup: "9-12", name: "Writing & Sketching", description: "Both writing and sketching journals.", categories: ["WRITING", "SKETCH_2"], displayOrder: 0 },
  { ageGroup: "9-12", name: "Writing only", description: "Writing journals.", categories: ["WRITING"], displayOrder: 1 },
  { ageGroup: "9-12", name: "Sketching only", description: "Sketching journals.", categories: ["SKETCH_2"], displayOrder: 2 },
] as const;

/** Which programme an existing plan belongs to, from its age group and name (or the journals it used to list). */
function programmeFor(plan: { ageGroup: string; name: string; journals?: string[] }) {
  if (plan.ageGroup === "6-8") return "Sketching";
  const journals = plan.journals ?? [];
  if (/both/i.test(plan.name) || (journals.includes("SKETCHING") && journals.includes("WRITING"))) return "Writing & Sketching";
  if (/writ/i.test(plan.name) || journals.includes("WRITING")) return "Writing only";
  if (/sketch/i.test(plan.name) || journals.includes("SKETCHING")) return "Sketching only";
  return null;
}

const norm = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not set. Add it to your .env file.");
  await mongoose.connect(mongoUri);
  const { TopicCategory } = await import("../src/models/TopicCategory");
  const { TopicVersion } = await import("../src/models/TopicVersion");
  const { Topic } = await import("../src/models/Topic");
  const { Programme } = await import("../src/models/Programme");
  const { SubscriptionPlan } = await import("../src/models/SubscriptionPlan");

  // 1. Categories.
  const categoryIds: Record<string, mongoose.Types.ObjectId> = {};
  for (const [order, category] of CATEGORIES.entries()) {
    const existing = await TopicCategory.findOne({ name: category.name });
    const doc = existing ?? (await TopicCategory.create({
      name: category.name, heading: category.heading, description: category.description, selectionLimit: 10, displayOrder: order, active: true,
    }));
    categoryIds[category.key] = doc._id;
    console.log(`${existing ? "Kept" : "Added"} category: ${category.name}`);
  }

  // 2. The live topic set.
  let version = await TopicVersion.findOne({ status: "ACTIVE" });
  if (!version) {
    version = await TopicVersion.create({ name: "2026 Q4", status: "ACTIVE", publishedAt: new Date() });
    console.log(`Added live topic set: ${version.name}`);
  }

  // 3. Topics: older ones (age group + journal) move into their category; then any missing starting topic is added.
  const raw = Topic.collection;
  for (const category of CATEGORIES) {
    const moved = await raw.updateMany(
      { ageGroup: category.legacy.ageGroup, kind: category.legacy.kind },
      { $set: { category: categoryIds[category.key], version: version._id }, $unset: { ageGroup: "", kind: "" } }
    );
    if (moved.modifiedCount) console.log(`Moved ${moved.modifiedCount} older topics into ${category.name}`);

    const current = await Topic.find({ version: version._id, category: categoryIds[category.key] }).lean();
    let added = 0;
    for (const [order, title] of category.titles.entries()) {
      const match = current.find((topic) => norm(topic.title) === norm(title));
      if (match) {
        await Topic.updateOne({ _id: match._id }, { $set: { title, displayOrder: order } });
      } else {
        await Topic.create({ version: version._id, category: categoryIds[category.key], title, displayOrder: order, active: true });
        added += 1;
      }
    }
    console.log(`${category.name}: ${category.titles.length} topics in "${version.name}" (${added} added)`);
  }

  // 4. Programmes, and plans linked to them.
  const programmeIds: Record<string, mongoose.Types.ObjectId> = {};
  for (const programme of PROGRAMMES) {
    const existing = await Programme.findOne({ ageGroup: programme.ageGroup, name: programme.name });
    const doc = existing ?? (await Programme.create({
      ...programme, categories: programme.categories.map((key) => categoryIds[key]), active: true,
    }));
    programmeIds[`${programme.ageGroup}|${programme.name}`] = doc._id;
    console.log(`${existing ? "Kept" : "Added"} programme: Ages ${programme.ageGroup} · ${programme.name}`);
  }

  const plans = await SubscriptionPlan.collection.find({}).toArray();
  for (const plan of plans) {
    if (!plan.programme) {
      const name = programmeFor(plan as unknown as { ageGroup: string; name: string; journals?: string[] });
      const id = name ? programmeIds[`${plan.ageGroup}|${name}`] : undefined;
      if (id) {
        await SubscriptionPlan.collection.updateOne({ _id: plan._id }, { $set: { programme: id } });
        console.log(`Plan "${plan.name}" (Ages ${plan.ageGroup}, ${plan.durationMonths} mo) → ${name}`);
      } else {
        console.log(`Plan "${plan.name}" (Ages ${plan.ageGroup}): choose its programme in Admin → Subscriptions.`);
      }
    }
  }
  await SubscriptionPlan.collection.updateMany({ journals: { $exists: true } }, { $unset: { journals: "" } });

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
