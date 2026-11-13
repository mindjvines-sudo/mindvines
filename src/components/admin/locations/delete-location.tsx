"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonClasses } from "@/components/admin/ui/button";
import { Modal } from "@/components/admin/ui/modal";
import { sendJson } from "./api";

/** Deletes a pincode nobody has registered from. The server refuses otherwise. */
export function DeleteLocation({ id, pincode, disabledReason }: { id: string; pincode: string; disabledReason?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    const result = await sendJson(`/api/admin/serviceable-locations/${id}`, "DELETE");
    setBusy(false);
    if (!result.ok) return setError(result.data.error ?? "Could not delete.");
    router.push("/admin/locations");
    router.refresh();
  }

  return (
    <>
      <button type="button" disabled={Boolean(disabledReason)} title={disabledReason} onClick={() => setOpen(true)} className={`${buttonClasses({ variant: "danger-soft", size: "sm" })} disabled:cursor-not-allowed disabled:opacity-50`}>
        Delete
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Delete ${pincode}?`} size="sm">
        <p className="text-sm leading-6 text-slate-600">This removes the pincode from the list. You can add it again later.</p>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="button" variant="danger" disabled={busy} onClick={confirm}>{busy ? "Deleting…" : "Delete"}</Button>
        </div>
      </Modal>
    </>
  );
}
