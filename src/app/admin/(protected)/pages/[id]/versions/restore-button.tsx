"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreVersionAction } from "../../actions";
import { Button } from "@/components/admin/ui/button";

export function RestoreButton({ pageId, versionNumber }: { pageId: string; versionNumber: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Copy version ${versionNumber} into the draft? Your current draft will be replaced.`)) return;
          start(async () => {
            const result = await restoreVersionAction(pageId, versionNumber);
            if (result.ok) router.push(`/admin/pages/${pageId}/edit`);
            else setError(result.message);
          });
        }}
      >
        {pending ? "Restoring…" : "Restore to draft"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
