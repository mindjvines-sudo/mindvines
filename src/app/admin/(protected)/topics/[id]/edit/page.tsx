import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { getTopic, getTopicVersion, listTopicCategories } from "@/services/topic.service";
import { TopicForm } from "../../topic-form";
import { updateTopicAction } from "../../actions";

export const metadata: Metadata = { title: "Edit Topic" };

export default async function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "update", "topics")) redirect("/admin/dashboard");
  const { id } = await params;
  const topic = await getTopic(id);
  if (!topic) notFound();
  const [version, categories] = await Promise.all([getTopicVersion(topic.version.toString()), listTopicCategories()]);
  if (!version) notFound();
  const back = `/admin/topics?version=${version._id}&category=${topic.category}`;
  if (version.status === "ARCHIVED") redirect(back);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit topic" description={topic.title} back={{ href: back, label: "All topics" }} />
      <TopicForm
        action={updateTopicAction.bind(null, id)}
        submitLabel="Save changes"
        versionName={version.name}
        cancelHref={back}
        categories={categories.map((category) => ({ id: category._id.toString(), name: category.name }))}
        defaultValues={{ title: topic.title, category: topic.category.toString(), active: topic.active }}
      />
    </div>
  );
}
