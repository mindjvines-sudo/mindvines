"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The plans page's age switch. Every age's plans arrive with the page, so
 * choosing one only swaps which is shown: no request, no wait. The address
 * keeps `?age=` in step, so a refresh or a shared link opens the same age.
 */
export function AgePlanSwitcher({
  title,
  intro,
  initial,
  panels,
}: {
  title: string;
  intro: string;
  initial: string;
  panels: { age: string; panel: React.ReactNode }[];
}) {
  const [age, setAge] = useState(initial);

  function choose(event: React.MouseEvent<HTMLAnchorElement>, next: string) {
    // Let new-tab and new-window clicks through to the link itself.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setAge(next);
    window.history.replaceState(null, "", `?age=${next}`);
  }

  return (
    <>
      <div className="bg-cream text-ink">
        <div className="mx-auto max-w-[1200px] px-5 pb-12 pt-16 text-center sm:px-8 lg:pb-16 lg:pt-20">
          <h1 className="fluid-heading font-display font-bold">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg">{intro}</p>
          <p className="mt-3 text-[16px]">
            Already registered?{" "}
            <Link href="/renew" className="font-bold underline underline-offset-4">Renew with your registration number</Link>
          </p>
          <nav aria-label="Choose an age group" className="mt-8 flex flex-wrap justify-center gap-3">
            {panels.map(({ age: option }) => (
              <a
                key={option}
                href={`/subscriptions?age=${option}`}
                onClick={(event) => choose(event, option)}
                aria-current={option === age ? "page" : undefined}
                className={cn(
                  "rounded-full border px-6 py-3 font-bold transition-colors",
                  option === age ? "border-ink bg-ink text-paper" : "border-ink/20 hover:bg-stone",
                )}
              >
                Ages {option}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {panels.map(({ age: option, panel }) => (
        <div key={option} hidden={option !== age}>
          {panel}
        </div>
      ))}
    </>
  );
}
