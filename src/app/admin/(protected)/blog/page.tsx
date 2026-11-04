import type { Metadata } from "next";
import Link from "next/link";
import { getBlogStats, listBlogPostsAdmin } from "@/services/blog.service";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { CONTENT_STATUSES, type ContentStatus } from "@/lib/constants";
import { deleteBlogPostAction } from "./actions";
import { asPopulatedMedia } from "@/types/media";
import { BlogImageViewer } from "./blog-image-viewer";
import { Card } from "@/components/admin/ui/card";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge, statusLabel } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { FilterTabs, Pagination, SearchForm, hrefWith } from "@/components/admin/ui/list-controls";
import { Table, TBody, THead, Td, Th, Tr, RowActions } from "@/components/admin/ui/table";
import { ButtonLink } from "@/components/admin/ui/button";
import { ConfirmAction } from "@/components/admin/ui/confirm-action";
import { DocumentIcon, EyeIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";

export const metadata: Metadata = { title: "Blog" };

function parseStatus(value: string | undefined): ContentStatus | undefined {
  return CONTENT_STATUSES.includes(value as ContentStatus) ? (value as ContentStatus) : undefined;
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const search = params.search?.trim() || undefined;
  const [user, result, stats] = await Promise.all([
    getCurrentUser(),
    listBlogPostsAdmin({ page: params.page, status, search }),
    getBlogStats(),
  ]);

  const canCreate = can(user.role, "create", "blog");
  const canDelete = can(user.role, "delete", "blog");
  const counts: Record<ContentStatus, number> = {
    PUBLISHED: stats.published,
    DRAFT: stats.draft,
    ARCHIVED: Math.max(stats.total - stats.published - stats.draft, 0),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Blog"
        description="Health articles and clinic news published on the website."
        actions={
          canCreate && (
            <ButtonLink href="/admin/blog/new">
              <PlusIcon />
              New post
            </ButtonLink>
          )
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <FilterTabs
            label="Filter by status"
            tabs={[
              { label: "All", href: hrefWith("/admin/blog", { search }), active: !status, count: stats.total },
              ...CONTENT_STATUSES.map((s) => ({
                label: statusLabel(s),
                href: hrefWith("/admin/blog", { status: s, search }),
                active: status === s,
                count: counts[s],
              })),
            ]}
          />
          <SearchForm placeholder="Search by title" defaultValue={search} keep={{ status }} />
        </div>

        {result.items.length === 0 ? (
          <EmptyState
            icon={DocumentIcon}
            title={search || status ? "No matching posts" : "No blog posts yet"}
            description={
              search || status ? "Try a different search or status filter." : "Write your first article for patients."
            }
            action={
              search || status ? (
                <ButtonLink href="/admin/blog" variant="secondary">
                  Clear filters
                </ButtonLink>
              ) : canCreate ? (
                <ButtonLink href="/admin/blog/new">
                  <PlusIcon />
                  New post
                </ButtonLink>
              ) : undefined
            }
            className="border-t border-line"
          />
        ) : (
          <Table minWidth={520}>
            <THead>
              <tr>
                <Th>Post</Th>
                <Th>Status</Th>
                <Th hideBelow="md">Updated</Th>
                <Th align="right">Actions</Th>
              </tr>
            </THead>
            <TBody>
              {result.items.map((item) => {
                const image = asPopulatedMedia(item.featuredImage);
                return (
                  <Tr key={item._id.toString()}>
                    <Td>
                      <div className="flex items-center gap-3.5">
                        <BlogImageViewer
                          image={image ? { secureUrl: image.secureUrl, altText: image.altText } : null}
                          title={item.title}
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/blog/${item._id}/edit`}
                            className="line-clamp-2 font-medium text-navy-900 hover:text-primary-700"
                          >
                            {item.title}
                          </Link>
                          <p className="mt-0.5 truncate text-xs text-slate-400">/blog/{item.slug}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <StatusBadge status={item.status} />
                    </Td>
                    <Td hideBelow="md" className="whitespace-nowrap tabular-nums">
                      {new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Td>
                    <Td align="right">
                      <RowActions>
                        <ButtonLink href={`/admin/blog/${item._id}/preview`} variant="ghost" size="sm" aria-label={`Preview ${item.title}`} title="Preview">
                          <EyeIcon />
                        </ButtonLink>
                        <ButtonLink href={`/admin/blog/${item._id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${item.title}`} title="Edit">
                          <PencilIcon />
                        </ButtonLink>
                        {canDelete && (
                          <ConfirmAction
                            action={deleteBlogPostAction.bind(null, item._id.toString())}
                            title="Delete this post?"
                            description={`“${item.title}” will be permanently removed from the admin and the website. This can’t be undone.`}
                            confirmLabel="Delete post"
                            triggerLabel={`Delete ${item.title}`}
                            trigger={<TrashIcon />}
                          />
                        )}
                      </RowActions>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}

        <Pagination
          path="/admin/blog"
          page={result.page}
          pages={result.pages}
          total={result.total}
          limit={result.limit}
          params={{ status, search }}
          noun="posts"
        />
      </Card>
    </div>
  );
}
