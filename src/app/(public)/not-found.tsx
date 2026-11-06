import Link from "next/link";

import { PillButton } from "@/components/ui/PillButton";
import { listPublishedAgeGroups } from "@/services/age-group.service";

/**
 * The public site's 404, inside its header and footer: an unknown address
 * (see ./[...missing]) or a page that called notFound(), such as an age group
 * or plan that is no longer published. It points back to the places that
 * do exist.
 */
export default async function NotFound() {
  const ageGroups = await listPublishedAgeGroups().catch(() => []);
  const links = [
    ...ageGroups.map((group) => ({ label: group.title, href: `/age-groups/${group.slug}` })),
    { label: "Subscription plans", href: "/subscriptions" },
  ];

  return (
    <section className="bg-cream">
      <div className="mx-auto flex max-w-[840px] flex-col items-center px-5 py-20 text-center sm:px-8 lg:py-[120px]">
        <p aria-hidden className="font-display text-[96px] font-bold leading-none text-amber lg:text-[140px]">
          404
        </p>
        <h1 className="mt-6 font-display text-[30px] font-bold leading-[1.1] text-ink sm:text-[38px] lg:text-[45.5px]">
          This page has wandered off
        </h1>
        <p className="mt-5 max-w-[560px] text-[17px] font-bold leading-[1.4] text-ink/80 lg:text-[20px]">
          The link may be old, or the page may have moved. Let&apos;s get you back to the journals.
        </p>
        <div aria-hidden className="zigzag-rule mx-auto mt-8 w-[197px]" />
        <div className="mt-10">
          <PillButton href="/">Back to home</PillButton>
        </div>

        <nav aria-label="Pages you might be looking for" className="mt-12">
          <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-tan">Or explore</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-3">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex h-[42px] items-center rounded-full border border-ink/20 bg-paper px-5 text-[16px] font-bold text-ink transition-colors hover:bg-stone"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
