import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/page-header";
import { PageForm } from "../page-form";
import { createPageAction } from "../actions";

export const metadata: Metadata = { title: "New Page" };

export default function NewPagePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/admin/pages", label: "All pages" }} title="New page" />
      <PageForm action={createPageAction} submitLabel="Create page" />
    </div>
  );
}
