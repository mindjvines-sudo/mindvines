import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui/page-header";
import { getActiveTopicVersion, getTopicVersion, listTopicCategories } from "@/services/topic.service";
import { TopicForm } from "../topic-form";
import { createTopicAction } from "../actions";

export const metadata: Metadata = { title: "Add Topic" };

export default async function NewTopicPage({ searchParams }: { searchParams: Promise<{ version?: string; category?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "create", "topics")) redirect("/admin/dashboard");
  const query = await searchParams;
  const [version, categories] = await Promise.all([
    query.version ? getTopicVersion(query.version) : getActiveTopicVersion(),
    listTopicCategories(),
  ]);
  if (!version || version.status === "ARCHIVED") notFound();
  const versionId = version._id.toString();
  const back = `/admin/topics?version=${versionId}${query.category ? `&category=${query.category}` : ""}`;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add topic" back={{ href: back, label: "All topics" }} />
      <TopicForm
        action={createTopicAction.bind(null, versionId)}
        submitLabel="Add topic"
        versionName={version.name}
        cancelHref={back}
        categories={categories.map((category) => ({ id: category._id.toString(), name: category.name }))}
        defaultValues={{ category: categories.some((c) => c._id.toString() === query.category) ? query.category : undefined }}
      />
    </div>
  );
}
