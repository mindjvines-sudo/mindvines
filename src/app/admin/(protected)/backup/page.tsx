import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Card } from "@/components/admin/ui/card";
import { buttonClasses } from "@/components/admin/ui/button";
import { getAuthenticatedUser } from "@/lib/dal";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Database Backup" };

export default async function BackupPage() {
  const user = await getAuthenticatedUser();
  if (!user || !can(user.role, "read", "backup")) redirect("/admin");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Database Backup" description="Download a copy of all your data as one file." />
      <Card className="max-w-3xl p-6">
        <h2 className="text-base font-semibold text-slate-900">Full backup</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Includes every collection: registrations, payments, pilot registrations, enquiries, pages, topics, settings, users and the rest.
          The file is JSON and keeps ids and dates exactly as stored. Larger databases take a little while to prepare, so keep this tab open until the download finishes.
        </p>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The file holds customers’ personal details and staff password hashes. Store it somewhere private and don’t share it.
          Images in the Media Library are stored in Cloudinary and are not part of this file.
        </p>
        <a href="/api/admin/backup" download className={buttonClasses({ className: "mt-5" })}>
          Download backup
        </a>
      </Card>
    </div>
  );
}
