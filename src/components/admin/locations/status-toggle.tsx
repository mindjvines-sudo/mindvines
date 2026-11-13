"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/admin/ui/button";
import { Modal } from "@/components/admin/ui/modal";
import { sendJson } from "./api";

/** Activates or deactivates a pincode, after a confirmation. Existing registrations are unaffected either way. */
export function StatusToggle({ id, pincode, isServiceable, registered }: { id: string; pincode: string; isServiceable: boolean; registered: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const turningOff = isServiceable;

  async function confirm() {
    setBusy(true);
    setError("");
    const result = await sendJson(`/api/admin/serviceable-locations/${id}/status`, "PATCH", { isServiceable: !isServiceable });
    setBusy(false);
    if (!result.ok) return setError(result.data.error ?? "Could not change the status.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses({ variant: turningOff ? "warning-soft" : "success-soft", size: "sm" })}>
        {turningOff ? "Deactivate" : "Activate"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${turningOff ? "Deactivate" : "Activate"} ${pincode}?`} size="sm">
        <p className="text-sm leading-6 text-slate-600">
          {turningOff
            ? `New registrations from ${pincode} will be blocked straight away.${registered > 0 ? ` The ${registered} ${registered === 1 ? "child" : "children"} already registered from here keep their subscriptions and can renew.` : ""}`
            : `Parents in ${pincode} will be able to register their children again.`}
        </p>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" variant={turningOff ? "danger" : "primary"} disabled={busy} onClick={confirm}>{busy ? "Working…" : turningOff ? "Deactivate" : "Activate"}</Button>
        </div>
      </Modal>
    </>
  );
}
