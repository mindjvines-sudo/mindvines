import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PageSections } from "@/components/cms/PageBody";
import { getPublishedPage, getRedirectTarget } from "@/lib/cms/public";
import { slugProblem } from "@/lib/cms/reserved";
import { buildMetadata } from "@/lib/seo";
import type { PageContent } from "@/lib/cms/sections";

type Props = { params: Promise<{ slug: string }> };

/** The page at this address, or where it moved to. Never a draft. */
async function resolve(slug: string) {
  // Reserved and malformed addresses belong to the site itself, never to a CMS page.
  if (slugProblem(slug)) return { page: null, to: null };
  const page = await getPublishedPage(slug);
  if (page) return { page, to: null };
  return { page: null, to: await getRedirectTarget(slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await resolve(slug);
  if (!page) return { title: "Page not found", robots: { index: false } };
  const seo = page.seo;
  return buildMetadata(
    {
      title: seo.title,
      description: seo.description,
      keywords: seo.keywords.length ? seo.keywords : null,
      canonical: seo.canonical || `/${page.slug}`,
      ogTitle: seo.ogTitle,
      ogDescription: seo.ogDescription,
      ogImage: seo.ogImage || page.featuredImage,
      robots: seo.index ? null : "noindex, nofollow",
    },
    { title: page.title, description: page.description || undefined }
  );
}

function faqJsonLd(sections: PageContent["sections"]) {
  const items = sections.flatMap((section) => (section.type === "faq" ? section.data.items : []));
  if (items.length === 0) return null;
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const { page, to } = await resolve(slug);
  if (!page) {
    if (to) permanentRedirect(`/${to}`);
    notFound();
  }
  const jsonLd = faqJsonLd(page.sections);
  return (
    <>
      <PageSections sections={page.sections} template={page.template} />
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
    </>
  );
}
