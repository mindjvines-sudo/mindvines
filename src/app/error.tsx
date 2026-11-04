"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to server-side monitoring in production; never surface `error.message`
    // (which may contain internal details) directly to the visitor.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-neutral-600">Please try again. If the problem persists, contact support.</p>
      <button onClick={reset} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white">
        Try again
      </button>
    </div>
  );
}
