import { cn } from "@/lib/utils";

/**
 * The live site's amber call-to-action: a fully rounded pill sitting on a
 * hard ink edge, which it presses into on hover.
 */
export function PillButton({
  href,
  size = "md",
  children,
}: {
  href: string;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-amber font-bold text-ink shadow-pressed transition-[transform,box-shadow,background-color] duration-200",
        "hover:translate-x-[1px] hover:translate-y-[2px] hover:bg-[#f5b21c] hover:shadow-[1px_2px_0_0_var(--color-ink)]",
        size === "lg"
          ? "h-[72px] px-[34px] text-[20px] lg:h-[84px] lg:px-[38px] lg:text-[22.8px]"
          : "h-[44px] px-[38px] text-[18px]",
      )}
    >
      {children}
    </a>
  );
}
