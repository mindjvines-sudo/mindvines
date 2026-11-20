import Link from "next/link";
import { cn } from "@/lib/utils";

/** The two ways to register: the standard plans, or a pilot offer. */
export function RegistrationTypeSwitch({ current }: { current: "standard" | "pilot" }) {
  const item = (active: boolean) =>
    cn(
      "flex min-h-12 flex-1 flex-col items-center justify-center rounded-full px-4 py-1.5 text-center leading-tight transition-colors sm:min-h-11 sm:flex-none sm:flex-row sm:gap-1.5 sm:px-6",
      active ? "bg-ink text-paper" : "text-ink hover:bg-stone"
    );
  const label = (name: string) => (
    <>
      <span className="text-[16px] font-bold">{name}</span>
      <span className="text-[12px] font-semibold opacity-75 sm:text-[16px] sm:font-bold sm:opacity-100">Registration</span>
    </>
  );
  return (
    <nav aria-label="Registration type" className="bg-cream px-5 pt-8 sm:px-8">
      <div className="mx-auto flex max-w-[1100px] justify-center">
        <div className="flex w-full max-w-[420px] gap-1 rounded-full border border-ink/20 bg-paper p-1 sm:inline-flex sm:w-auto sm:max-w-none">
          <Link href="/subscriptions" aria-current={current === "standard" ? "page" : undefined} className={item(current === "standard")}>{label("Standard")}</Link>
          <Link href="/pilot" aria-current={current === "pilot" ? "page" : undefined} className={item(current === "pilot")}>{label("Pilot")}</Link>
        </div>
      </div>
    </nav>
  );
}
