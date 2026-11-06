import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { listTopicCategories, listTopicsAdmin, listTopicVersions } from "@/services/topic.service";
import { Card, CardHeader } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Badge } from "@/components/admin/ui/badge";
import { Alert, EmptyState } from "@/components/admin/ui/feedback";
import { FilterTabs, Pagination, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink, buttonClasses } from "@/components/admin/ui/button";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { ArrowDownIcon, ArrowUpIcon, LayersIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";
import { deleteTopicAction, deleteVersionAction, moveTopicAction, publishVersionAction, setTopicActiveAction } from "./actions";
import { VersionControls } from "./version-controls";

export const metadata: Metadata = { title: "Topic Management" };

const STATUS = {
  ACTIVE: { label: "Live", tone: "green" as const, note: "What new registrations choose from. Changes here apply straight away; registrations already made keep the topics they chose." },
  DRAFT: { label: "Draft", tone: "amber" as const, note: "Parents don't see this set until it is published. Publishing makes it live and archives the current live set." },
  ARCHIVED: { label: "Archived", tone: "slate" as const, note: "An earlier quarter's set, kept so past registrations' choices stay readable. It can't be edited." },
};

export default async function TopicsPage({ searchParams }: { searchParams: Promise<{ version?: string; category?: string; page?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "read", "topics")) redirect("/admin/dashboard");
  const query = await searchParams;

  const [versions, categories] = await Promise.all([listTopicVersions(), listTopicCategories()]);
  const selected = versions.find((version) => version._id.toString() === query.version) ?? versions.find((version) => version.status === "ACTIVE") ?? versions[0];
  const versionId = selected?._id.toString();
  const category = categories.find((item) => item._id.toString() === query.category);
  const result = await listTopicsAdmin(versionId ?? "", {
    categoryId: category?._id.toString(),
    page: query.page,
    order: categories.map((item) => item._id.toString()),
  });
  const topics = result.items;
  const categoryName = new Map(categories.map((item) => [item._id.toString(), item.name]));

  const editable = Boolean(selected && selected.status !== "ARCHIVED");
  const canUpdate = editable && can(user.role, "update", "topics");
  const canCreate = can(user.role, "create", "topics");
  const status = selected ? STATUS[selected.status] : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Topic Management"
        description="The topics children choose from when they register, by category, in quarterly sets."
        actions={
          <>
            <ButtonLink href="/admin/topics/categories" variant="secondary"><LayersIcon />Categories</ButtonLink>
            {editable && canCreate && (
              <ButtonLink href={hrefWith("/admin/topics/new", { version: versionId, category: category?._id.toString() })}><PlusIcon />Add topic</ButtonLink>
            )}
          </>
        }
      />

      <Card>
        <CardHeader icon={LayersIcon} title="Topic sets" description="One set is live at a time. Prepare next quarter's as a draft and publish it when ready." />
        <div className="flex flex-col gap-5 px-5 pb-5">
          {versions.length > 0 && (
            <nav aria-label="Topic sets" className="flex flex-wrap gap-2">
              {versions.map((version) => {
                const current = version._id.toString() === versionId;
                return (
                  <Link
                    key={version._id.toString()}
                    href={hrefWith("/admin/topics", { version: version._id.toString() })}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                      current ? "border-primary-300 bg-primary-50 text-primary-800" : "border-line text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <span className="font-medium">{version.name}</span>
                    <Badge tone={STATUS[version.status].tone}>{STATUS[version.status].label}</Badge>
                    <span className="text-xs text-slate-400">{version.topicCount} topics</span>
                  </Link>
                );
              })}
            </nav>
          )}
          {selected && status && <Alert tone={selected.status === "DRAFT" ? "warning" : "info"}>{status.note}</Alert>}
          <VersionControls
            selected={selected ? { id: selected._id.toString(), name: selected.name, status: selected.status } : null}
            canEdit={Boolean(selected) && can(user.role, "update", "topics")}
            canCreate={canCreate}
          />
          {selected?.status === "DRAFT" && (
            <div className="flex flex-wrap gap-2">
              {can(user.role, "publish", "topics") && (
                <ConfirmAction
                  action={publishVersionAction.bind(null, selected._id.toString())}
                  title={`Publish “${selected.name}”?`}
                  description="It becomes the set parents choose from, straight away. The current live set is archived; registrations already made keep their topics."
                  confirmLabel="Publish set"
                  trigger="Publish this set"
                  variant="primary"
                  size="md"
                />
              )}
              {can(user.role, "delete", "topics") && (
                <ConfirmAction
                  action={deleteVersionAction.bind(null, selected._id.toString())}
                  title={`Delete the draft “${selected.name}”?`}
                  description="The draft and its topics are removed. The live set is not affected."
                  confirmLabel="Delete draft"
                  trigger="Delete draft"
                  variant="danger-soft"
                  size="md"
                />
              )}
            </div>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 sm:p-5">
          <FilterTabs
            label="Filter by category"
            tabs={[
              { label: "All categories", href: hrefWith("/admin/topics", { version: versionId }), active: !category, count: result.all },
              ...categories.map((item) => ({
                label: item.name,
                href: hrefWith("/admin/topics", { version: versionId, category: item._id.toString() }),
                active: category?._id.equals(item._id) ?? false,
                count: result.categories.get(item._id.toString())?.count ?? 0,
              })),
            ]}
          />
        </div>
        {topics.length === 0 ? (
          <EmptyState
            title={selected ? "No topics here yet" : "No topic sets yet"}
            description={selected ? "Add topics for parents to choose from." : "Run the registration setup, or start a set above."}
            className="border-t border-line"
          />
        ) : (
          <Table minWidth={680}>
            <THead>
              <tr>
                <Th>#</Th>
                <Th>Topic</Th>
                {!category && <Th hideBelow="md">Category</Th>}
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {topics.map((topic) => {
                const id = topic._id.toString();
                const bounds = result.categories.get(topic.category.toString());
                return (
                  <Tr key={id} className={topic.active ? undefined : "bg-slate-50/60"}>
                    <Td className="w-12 tabular-nums text-slate-400">{topic.displayOrder + 1}</Td>
                    <Td><span className={cn("font-medium", topic.active ? "text-navy-900" : "text-slate-400")}>{topic.title}</span></Td>
                    {!category && <Td hideBelow="md" className="text-sm text-slate-600">{categoryName.get(topic.category.toString())}</Td>}
                    <Td>{topic.active ? <Badge tone="green">Shown</Badge> : <Badge tone="slate">Hidden</Badge>}</Td>
                    <Td align="right">
                      {canUpdate ? (
                        <RowActions>
                          <form action={moveTopicAction.bind(null, id, "up")}>
                            <button type="submit" disabled={!bounds || topic.displayOrder <= bounds.first} aria-label={`Move ${topic.title} up`} className={buttonClasses({ variant: "ghost", size: "sm" })}><ArrowUpIcon /></button>
                          </form>
                          <form action={moveTopicAction.bind(null, id, "down")}>
                            <button type="submit" disabled={!bounds || topic.displayOrder >= bounds.last} aria-label={`Move ${topic.title} down`} className={buttonClasses({ variant: "ghost", size: "sm" })}><ArrowDownIcon /></button>
                          </form>
                          <form action={setTopicActiveAction.bind(null, id, !topic.active)}>
                            <button type="submit" className={buttonClasses({ variant: "ghost", size: "sm" })}>{topic.active ? "Hide" : "Show"}<span className="sr-only"> {topic.title}</span></button>
                          </form>
                          <ButtonLink href={`/admin/topics/${id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${topic.title}`}><PencilIcon /></ButtonLink>
                          {can(user.role, "delete", "topics") && (
                            <ConfirmAction
                              action={deleteTopicAction.bind(null, id)}
                              title="Delete this topic?"
                              description={`“${topic.title}” is removed from this set. Registrations that already chose it keep it.`}
                              confirmLabel="Delete topic"
                              triggerLabel={`Delete ${topic.title}`}
                              trigger={<TrashIcon />}
                            />
                          )}
                        </RowActions>
                      ) : (
                        <span className="text-xs text-slate-400">Read only</span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
        <Pagination path="/admin/topics" page={result.page} pages={result.pages} total={result.total} limit={result.limit} params={{ version: versionId, category: category?._id.toString() }} noun="topics" />
      </Card>
    </div>
  );
}
