"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import {
  topicCategoryInputSchema,
  topicInputSchema,
  topicVersionNameSchema,
  type TopicCategoryInput,
  type TopicInput,
} from "@/validations/topic.schema";
import * as topics from "@/services/topic.service";
import { logAction } from "@/services/audit.service";

export type TopicFormState = { errors?: Partial<Record<keyof TopicInput, string[]>>; message?: string } | undefined;
export type CategoryFormState = { errors?: Partial<Record<keyof TopicCategoryInput, string[]>>; message?: string } | undefined;
export type VersionFormState = { message?: string; done?: boolean } | undefined;

/** The registration form reads topics fresh on every visit, so only the admin pages need refreshing. */
function revalidateTopics() {
  revalidatePath("/admin/topics", "layout");
  revalidatePath("/admin/programmes", "layout");
}

const topicsHref = (versionId?: string, categoryId?: string) => {
  const query = new URLSearchParams();
  if (versionId) query.set("version", versionId);
  if (categoryId) query.set("category", categoryId);
  const search = query.toString();
  return `/admin/topics${search ? `?${search}` : ""}`;
};

async function requireTopics(action: "create" | "update" | "delete") {
  const user = await getCurrentUser();
  if (!can(user.role, action, "topics")) throw new Error("You do not have permission to change topics.");
  return user;
}

// Topics ---------------------------------------------------------------------

function parseTopic(formData: FormData) {
  return topicInputSchema.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") === "on" });
}

export async function createTopicAction(versionId: string, _prev: TopicFormState, formData: FormData): Promise<TopicFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "topics")) return { message: "You do not have permission to add topics." };
  const result = parseTopic(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  const version = await topics.getTopicVersion(versionId);
  if (!version || version.status === "ARCHIVED") return { message: "Topics can only be added to the live set or a draft." };
  try {
    const topic = await topics.createTopic({ ...result.data, version: versionId });
    await logAction({ userId: user.id, action: "CREATE", entity: "Topic", entityId: topic._id.toString() });
  } catch {
    return { message: "Unable to save the topic. Please try again." };
  }
  revalidateTopics();
  redirect(topicsHref(versionId, result.data.category));
}

export async function updateTopicAction(id: string, _prev: TopicFormState, formData: FormData): Promise<TopicFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "topics")) return { message: "You do not have permission to edit topics." };
  const result = parseTopic(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  let versionId = "";
  try {
    const topic = await topics.updateTopic(id, result.data);
    if (!topic) return { message: "This topic no longer exists." };
    versionId = topic.version.toString();
    await logAction({ userId: user.id, action: "UPDATE", entity: "Topic", entityId: id });
  } catch {
    return { message: "Unable to save the topic. Please try again." };
  }
  revalidateTopics();
  redirect(topicsHref(versionId, result.data.category));
}

export async function setTopicActiveAction(id: string, active: boolean): Promise<void> {
  const user = await requireTopics("update");
  if (await topics.setTopicActive(id, active)) await logAction({ userId: user.id, action: "UPDATE", entity: "Topic", entityId: id });
  revalidateTopics();
}

export async function moveTopicAction(id: string, direction: "up" | "down"): Promise<void> {
  await requireTopics("update");
  await topics.moveTopic(id, direction);
  revalidateTopics();
}

export async function deleteTopicAction(id: string): Promise<void> {
  const user = await requireTopics("delete");
  if (await topics.deleteTopic(id)) await logAction({ userId: user.id, action: "DELETE", entity: "Topic", entityId: id });
  revalidateTopics();
}

// Quarterly versions ---------------------------------------------------------

export async function createVersionAction(_prev: VersionFormState, formData: FormData): Promise<VersionFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "topics")) return { message: "You do not have permission to start a topic set." };
  const name = topicVersionNameSchema.safeParse(formData.get("name"));
  if (!name.success) return { message: name.error.issues[0]?.message };
  const version = await topics.createDraftTopicVersion(name.data);
  await logAction({ userId: user.id, action: "CREATE", entity: "TopicVersion", entityId: version._id.toString() });
  revalidateTopics();
  redirect(topicsHref(version._id.toString()));
}

export async function renameVersionAction(id: string, _prev: VersionFormState, formData: FormData): Promise<VersionFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "topics")) return { message: "You do not have permission to rename topic sets." };
  const name = topicVersionNameSchema.safeParse(formData.get("name"));
  if (!name.success) return { message: name.error.issues[0]?.message };
  if (!(await topics.renameTopicVersion(id, name.data))) return { message: "This topic set no longer exists." };
  await logAction({ userId: user.id, action: "UPDATE", entity: "TopicVersion", entityId: id });
  revalidateTopics();
  return { done: true };
}

export async function publishVersionAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user.role, "publish", "topics")) throw new Error("You do not have permission to publish topic sets.");
  if ((await topics.publishTopicVersion(id)) !== "published") throw new Error("Only a draft can be published.");
  await logAction({ userId: user.id, action: "PUBLISH", entity: "TopicVersion", entityId: id });
  revalidateTopics();
  redirect(topicsHref(id));
}

export async function deleteVersionAction(id: string): Promise<void> {
  const user = await requireTopics("delete");
  if (await topics.deleteDraftTopicVersion(id)) await logAction({ userId: user.id, action: "DELETE", entity: "TopicVersion", entityId: id });
  revalidateTopics();
  redirect("/admin/topics");
}

// Categories -----------------------------------------------------------------

function parseCategory(formData: FormData) {
  return topicCategoryInputSchema.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") === "on" });
}

export async function createCategoryAction(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "topics")) return { message: "You do not have permission to add categories." };
  const result = parseCategory(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  try {
    const category = await topics.createTopicCategory(result.data);
    await logAction({ userId: user.id, action: "CREATE", entity: "TopicCategory", entityId: category._id.toString() });
  } catch {
    return { message: "Unable to save the category. Please try again." };
  }
  revalidateTopics();
  redirect("/admin/topics/categories");
}

export async function updateCategoryAction(id: string, _prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "topics")) return { message: "You do not have permission to edit categories." };
  const result = parseCategory(formData);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  try {
    if (!(await topics.updateTopicCategory(id, result.data))) return { message: "This category no longer exists." };
    await logAction({ userId: user.id, action: "UPDATE", entity: "TopicCategory", entityId: id });
  } catch {
    return { message: "Unable to save the category. Please try again." };
  }
  revalidateTopics();
  redirect("/admin/topics/categories");
}

export async function deleteCategoryAction(id: string): Promise<void> {
  const user = await requireTopics("delete");
  const result = await topics.deleteTopicCategory(id);
  if (result === "in-use") throw new Error("This category still has topics or is used by a programme. Switch it off instead.");
  if (result === "deleted") await logAction({ userId: user.id, action: "DELETE", entity: "TopicCategory", entityId: id });
  revalidateTopics();
}
