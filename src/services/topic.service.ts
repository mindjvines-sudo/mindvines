import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { requiredPicks } from "@/lib/topics";
import { getPagination, totalPages } from "@/lib/utils";
import { Programme } from "@/models/Programme";
import { Topic } from "@/models/Topic";
import { TopicCategory } from "@/models/TopicCategory";
import { TopicVersion } from "@/models/TopicVersion";
import type { TopicCategoryInput, TopicInput } from "@/validations/topic.schema";

// Categories ---------------------------------------------------------------

export async function listTopicCategories() {
  await connectToDatabase();
  return TopicCategory.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
}

export async function listTopicCategoriesPage(params: { page?: string | number } = {}) {
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const [items, total] = await Promise.all([
    TopicCategory.find().sort({ displayOrder: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
    TopicCategory.estimatedDocumentCount(),
  ]);
  return { items, page, limit, total, pages: totalPages(total, limit) };
}

export async function getTopicCategory(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return TopicCategory.findById(id).lean();
}

export async function createTopicCategory(input: TopicCategoryInput) {
  await connectToDatabase();
  return TopicCategory.create(input);
}

export async function updateTopicCategory(id: string, input: TopicCategoryInput) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return TopicCategory.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
}

/** A category still holding topics, or used by a programme, can't be deleted: hide it instead. */
export async function deleteTopicCategory(id: string): Promise<"deleted" | "in-use" | "missing"> {
  if (!isValidObjectId(id)) return "missing";
  await connectToDatabase();
  const [topics, programmes] = await Promise.all([Topic.countDocuments({ category: id }), Programme.countDocuments({ categories: id })]);
  if (topics > 0 || programmes > 0) return "in-use";
  return (await TopicCategory.findByIdAndDelete(id)) ? "deleted" : "missing";
}

// Versions -----------------------------------------------------------------

export async function listTopicVersions() {
  await connectToDatabase();
  const versions = await TopicVersion.find().sort({ createdAt: -1 }).lean();
  const counts = await Topic.aggregate<{ _id: Types.ObjectId; count: number }>([{ $group: { _id: "$version", count: { $sum: 1 } } }]);
  const byVersion = new Map(counts.map((row) => [row._id.toString(), row.count]));
  return versions.map((version) => ({ ...version, topicCount: byVersion.get(version._id.toString()) ?? 0 }));
}

export async function getActiveTopicVersion() {
  await connectToDatabase();
  return TopicVersion.findOne({ status: "ACTIVE" }).lean();
}

export async function getTopicVersion(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return TopicVersion.findById(id).lean();
}

/** Next quarter's set starts as a copy of the live one, as a draft nobody sees until it is published. */
export async function createDraftTopicVersion(name: string) {
  await connectToDatabase();
  const active = await TopicVersion.findOne({ status: "ACTIVE" }).lean();
  const version = await TopicVersion.create({ name, status: "DRAFT" });
  if (active) {
    const topics = await Topic.find({ version: active._id }).lean();
    if (topics.length > 0) {
      await Topic.insertMany(
        topics.map((topic) => ({
          version: version._id,
          category: topic.category,
          title: topic.title,
          displayOrder: topic.displayOrder,
          active: topic.active,
        }))
      );
    }
  }
  return version;
}

/** Makes a draft the live set, archiving the one before. Registrations keep the topics they already chose. */
export async function publishTopicVersion(id: string): Promise<"published" | "not-draft"> {
  if (!isValidObjectId(id)) return "not-draft";
  await connectToDatabase();
  const draft = await TopicVersion.findOne({ _id: id, status: "DRAFT" });
  if (!draft) return "not-draft";
  const now = new Date();
  await TopicVersion.updateMany({ status: "ACTIVE" }, { $set: { status: "ARCHIVED", archivedAt: now } });
  await TopicVersion.updateOne({ _id: draft._id }, { $set: { status: "ACTIVE", publishedAt: now } });
  return "published";
}

export async function renameTopicVersion(id: string, name: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return TopicVersion.findByIdAndUpdate(id, { $set: { name } }, { new: true, runValidators: true });
}

/** Only an unpublished draft can be thrown away, with its topics. */
export async function deleteDraftTopicVersion(id: string) {
  if (!isValidObjectId(id)) return false;
  await connectToDatabase();
  const deleted = await TopicVersion.findOneAndDelete({ _id: id, status: "DRAFT" });
  if (deleted) await Topic.deleteMany({ version: deleted._id });
  return Boolean(deleted);
}

// Topics -------------------------------------------------------------------

/**
 * One page of a set's topics, plus per-category counts and the first and last
 * position in each (for the tabs and the move arrows), from one aggregate.
 */
export async function listTopicsAdmin(versionId: string, params: { categoryId?: string; page?: string | number; order?: string[] } = {}) {
  const empty = { items: [], page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, pages: 1, categories: new Map<string, { count: number; first: number; last: number }>(), all: 0 };
  if (!isValidObjectId(versionId)) return empty;
  await connectToDatabase();
  const { page, limit, skip } = getPagination(params);
  const version = new Types.ObjectId(versionId);
  const bounds = await Topic.aggregate<{ _id: Types.ObjectId; count: number; first: number; last: number }>([
    { $match: { version } },
    { $group: { _id: "$category", count: { $sum: 1 }, first: { $min: "$displayOrder" }, last: { $max: "$displayOrder" } } },
  ]);
  const categories = new Map(bounds.map((row) => [row._id.toString(), { count: row.count, first: row.first, last: row.last }]));
  const all = bounds.reduce((sum, row) => sum + row.count, 0);
  const total = params.categoryId ? categories.get(params.categoryId)?.count ?? 0 : all;

  // Topics are listed category by category (in the categories' own order), so a
  // page is cut across that order: only the categories it touches are queried.
  const sequence = params.categoryId
    ? [params.categoryId]
    : [...(params.order ?? []), ...[...categories.keys()].filter((id) => !(params.order ?? []).includes(id))];
  const fetchTopics = (category: string, from: number, take: number) =>
    Topic.find({ version, category }).sort({ displayOrder: 1, createdAt: 1 }).skip(from).limit(take).lean();
  const items: Awaited<ReturnType<typeof fetchTopics>> = [];
  let offset = 0;
  for (const id of sequence) {
    const count = categories.get(id)?.count ?? 0;
    const from = Math.max(0, skip - offset);
    const take = Math.min(count - from, limit - items.length);
    if (take > 0 && isValidObjectId(id)) {
      items.push(...(await fetchTopics(id, from, take)));
    }
    offset += count;
    if (items.length >= limit) break;
  }
  return { items, page, limit, total, pages: totalPages(total, limit), categories, all };
}

export async function getTopic(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return Topic.findById(id).lean();
}

/** A new topic goes to the end of its category's list. */
export async function createTopic(input: TopicInput & { version: string }) {
  await connectToDatabase();
  const last = await Topic.findOne({ version: input.version, category: input.category }).sort({ displayOrder: -1 }).lean();
  return Topic.create({ ...input, displayOrder: (last?.displayOrder ?? -1) + 1 });
}

export async function updateTopic(id: string, input: TopicInput) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return Topic.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
}

export async function setTopicActive(id: string, active: boolean) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return Topic.findByIdAndUpdate(id, { $set: { active } }, { new: true });
}

export async function deleteTopic(id: string) {
  if (!isValidObjectId(id)) return null;
  await connectToDatabase();
  return Topic.findByIdAndDelete(id);
}

/** Swaps a topic with its neighbour in the same list, renumbering the list so the order is always clean. */
export async function moveTopic(id: string, direction: "up" | "down") {
  if (!isValidObjectId(id)) return;
  await connectToDatabase();
  const topic = await Topic.findById(id).lean();
  if (!topic) return;
  const siblings = await Topic.find({ version: topic.version, category: topic.category }).sort({ displayOrder: 1, createdAt: 1 }).lean();
  const index = siblings.findIndex((item) => item._id.equals(topic._id));
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) return;
  [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
  await Topic.bulkWrite(siblings.map((item, order) => ({ updateOne: { filter: { _id: item._id }, update: { $set: { displayOrder: order } } } })));
}

// For the registration form ---------------------------------------------------

export type PreferenceCategory = {
  id: string;
  name: string;
  heading: string;
  description: string;
  required: number;
  topics: { id: string; title: string }[];
};

/**
 * The lists a programme's families pick from, in the programme's order: each
 * active category with its active topics in `versionId` (the live set when
 * omitted). Categories with no topics are left out.
 */
export async function listPreferenceCategories(programmeId: string | Types.ObjectId | null | undefined, versionId?: string | Types.ObjectId | null) {
  if (!programmeId) return { versionId: null, categories: [] as PreferenceCategory[] };
  await connectToDatabase();
  const [programme, version] = await Promise.all([
    Programme.findById(programmeId).select("categories").lean(),
    versionId ? TopicVersion.findById(versionId).lean() : TopicVersion.findOne({ status: "ACTIVE" }).lean(),
  ]);
  if (!programme || !version) return { versionId: null, categories: [] as PreferenceCategory[] };

  const ids = programme.categories ?? [];
  const [categories, topics] = await Promise.all([
    TopicCategory.find({ _id: { $in: ids }, active: true }).lean(),
    Topic.find({ version: version._id, category: { $in: ids }, active: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
  ]);
  const result = ids.flatMap((id) => {
    const category = categories.find((item) => item._id.equals(id));
    const offered = topics.filter((topic) => topic.category.equals(id)).map((topic) => ({ id: topic._id.toString(), title: topic.title }));
    if (!category || offered.length === 0) return [];
    return [{
      id: category._id.toString(),
      name: category.name,
      heading: category.heading,
      description: category.description ?? "",
      required: requiredPicks(offered.length, category.selectionLimit),
      topics: offered,
    }];
  });
  return { versionId: version._id.toString(), categories: result };
}
