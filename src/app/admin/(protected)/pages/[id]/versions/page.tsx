import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getPageForEditor, listVersions } from "@/services/cms-page.service";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Card } from "@/components/admin/ui/card";
import { Badge } from "@/components/admin/ui/badge";
import { EmptyState } from "@/components/admin/ui/feedback";
import { ClockIcon } from "@/components/admin/icons";
import { RestoreButton } from "./restore-button";

export const metadata: Metadata = { title: "Page history" };

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "read", "pages")) redirect("/admin/pages");
  const page = await getPageForEditor(id);
  if (!page) notFound();
  const versions = await listVersions(id);
  const canRestore = can(user.role, "update", "pages");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader back={{ href: `/admin/pages/${id}/edit`, label: "Back to the builder" }} title={`History: ${page.content.title}`} description="Every publish is saved. Restoring a version copies it into the draft; the live page doesn't change until you publish again." />
      {versions.length === 0 ? (
        <EmptyState icon={ClockIcon} title="Nothing published yet" />
      ) : (
        <Card className="divide-y divide-line">
          {versions.map((version) => (
            <div key={version.versionNumber} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-navy-900">
                  Version {version.versionNumber}
                  {page.publishedVersion === version.versionNumber && <Badge tone="green" className="ml-2">Live</Badge>}
                  {version.kind === "SCHEDULED" && <Badge tone="blue" className="ml-2">{page.scheduledVersion === version.versionNumber ? "Scheduled" : "Was scheduled"}</Badge>}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(version.createdAt).toLocaleString()} · {version.createdBy ?? "Unknown"} · /{version.slug} · {version.sectionCount} sections
                </p>
              </div>
              {canRestore && <RestoreButton pageId={id} versionNumber={version.versionNumber} />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
