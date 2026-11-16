import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageBody } from "@/components/cms/PageBody";
import { getAuthenticatedUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { CmsError, getPageForEditor, parseContent } from "@/services/cms-page.service";

// A signed-in admin's view of a page's current draft, exactly as it will render
// when published. Never indexed, never cached, and a 404 for everyone else.
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user || !can(user.role, "read", "pages")) notFound();
  const page = await getPageForEditor(id);
  if (!page) notFound();

  let content;
  try {
    // The same validation and sanitising a publish applies, so what is shown is what would go live.
    content = parseContent(page.content, page.systemKey);
  } catch (error) {
    const problems = error instanceof CmsError ? Object.values(error.fields ?? {}).flat().slice(0, 5) : [];
    return (
      <main className="mx-auto max-w-[860px] px-5 py-12">
        <h1 className="font-display text-2xl font-semibold">This draft can&apos;t be previewed yet</h1>
        <ul className="mt-4 list-disc pl-6">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
      </main>
    );
  }
  return (
    <>
      <div className="bg-amber px-5 py-2 text-center font-ui text-sm font-semibold text-ink">Preview of the draft · not visible to visitors · {page.status.toLowerCase()}</div>
      <PageBody sections={content.sections.filter((section) => section.visible)} template={content.template} ctx={{ pageKey: page.systemKey ?? undefined }} />
    </>
  );
}
