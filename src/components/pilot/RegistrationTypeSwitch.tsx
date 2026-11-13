import Link from "next/link";
import { cn } from "@/lib/utils";

/** The two ways to register: the standard plans, or a pilot offer. */
export function RegistrationTypeSwitch({ current }: { current: "standard" | "pilot" }) {
  const item = (active: boolean) =>
    cn(
      "inline-flex h-11 items-center rounded-full px-6 text-[16px] font-bold transition-colors",
      active ? "bg-ink text-paper" : "text-ink hover:bg-stone"
    );
  return (
    <nav aria-label="Registration type" className="bg-cream px-5 pt-8 sm:px-8">
      <div className="mx-auto flex max-w-[1100px] justify-center">
        <div className="inline-flex gap-1 rounded-full border border-ink/20 bg-paper p-1">
          <Link href="/subscriptions" aria-current={current === "standard" ? "page" : undefined} className={item(current === "standard")}>Standard Registration</Link>
          <Link href="/pilot" aria-current={current === "pilot" ? "page" : undefined} className={item(current === "pilot")}>Pilot Registration</Link>
        </div>
      </div>
    </nav>
  );
}
