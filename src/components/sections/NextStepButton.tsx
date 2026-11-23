"use client";

/** An arrow between two swipeable steps; tapping it scrolls the next one into view. */
export function NextStepButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        const next = event.currentTarget.closest("li")?.nextElementSibling;
        next?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }}
      className="mx-2 mt-[74px] grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber text-ink transition-transform active:scale-90"
    >
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}
