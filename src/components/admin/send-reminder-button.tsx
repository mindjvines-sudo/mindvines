"use client";

import { useState, useTransition } from "react";
import { buttonClasses } from "@/components/admin/ui/button";

/**
 * "Send renewal reminder": asks once (it emails a parent), sends, and says what
 * happened on the spot. Shows when the last reminder went out.
 */
export function SendReminderButton({
  action,
  email,
  lastSent,
  size = "sm",
}: {
  action: () => Promise<{ ok: boolean; message: string }>;
  email: string;
  lastSent?: string | null;
  size?: "sm" | "md";
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function send() {
    start(async () => {
      setResult(await action().catch(() => ({ ok: false, message: "Something went wrong. Please try again." })));
      setAsking(false);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {asking ? (
        <div className="flex flex-col items-end gap-1.5">
          <span className="max-w-[220px] text-right text-xs text-slate-600">Email a renewal reminder to {email}?</span>
          <span className="flex gap-1.5">
            <button type="button" onClick={send} disabled={pending} className={buttonClasses({ variant: "primary", size: "sm" })}>
              {pending ? "Sending…" : "Send"}
            </button>
            <button type="button" onClick={() => setAsking(false)} disabled={pending} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Cancel
            </button>
          </span>
        </div>
      ) : (
        <button type="button" onClick={() => { setResult(null); setAsking(true); }} className={buttonClasses({ variant: "secondary", size })}>
          {lastSent || result?.ok ? "Resend renewal reminder" : "Send renewal reminder"}
        </button>
      )}
      {result && <span role="status" className={result.ok ? "text-xs font-medium text-green-700" : "text-xs font-medium text-red-700"}>{result.message}</span>}
      {!result && lastSent && <span className="text-xs text-slate-400">Last sent {lastSent}</span>}
    </div>
  );
}
