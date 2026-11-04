import Image from "next/image";
import Link from "next/link";

import { FOOTER_LINKS, SITE } from "@/lib/content";

/** A thin ink rule, the small logo tucked top-left and the three policy links. */
export function Footer() {
  return (
    <footer className="border-t border-ink bg-paper">
      <div className="relative mx-auto flex max-w-[1440px] flex-col items-center gap-6 px-5 py-8 lg:block lg:h-[125px] lg:p-0">
        <Link href="/" aria-label={`${SITE.name} — home`} className="shrink-0 lg:absolute lg:left-[15px] lg:top-[14px]">
          <Image src={SITE.logo.src} alt={SITE.name} width={SITE.logo.width} height={SITE.logo.height} className="h-[38px] w-auto" />
        </Link>

        <nav aria-label="Legal" className="w-full lg:px-[40px] lg:pt-[45px]">
          <ul className="flex flex-col items-center gap-3 lg:grid lg:grid-cols-3">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href} className="text-center">
                <a
                  href={link.href}
                  className="text-[18px] font-bold text-tan underline underline-offset-[3px] transition-colors hover:text-ink lg:text-[20px]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
