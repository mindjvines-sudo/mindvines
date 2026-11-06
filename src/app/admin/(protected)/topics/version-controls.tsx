"use client";

import { useActionState } from "react";
import { Input } from "@/components/admin/ui/form";
import { buttonClasses } from "@/components/admin/ui/button";
import { createVersionAction, renameVersionAction, type VersionFormState } from "./actions";

/** Renaming the selected topic set, and starting next quarter's as a copy of the live one. */
export function VersionControls({ selected, canEdit, canCreate }: {
  selected: { id: string; name: string; status: string } | null;
  canEdit: boolean;
  canCreate: boolean;
}) {
  const [renameState, rename, renaming] = useActionState<VersionFormState, FormData>(
    selected ? renameVersionAction.bind(null, selected.id) : async () => undefined,
    undefined,
  );
  const [createState, create, creating] = useActionState<VersionFormState, FormData>(createVersionAction, undefined);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {selected && canEdit && (
        <form action={rename} className="flex flex-col gap-1.5">
          <label htmlFor="version-name" className="text-xs font-medium text-slate-600">Name of this set</label>
          <div className="flex gap-2">
            <Input id="version-name" name="name" defaultValue={selected.name} maxLength={60} key={selected.id} />
            <button type="submit" disabled={renaming} className={buttonClasses({ variant: "secondary" })}>{renaming ? "Saving…" : "Rename"}</button>
          </div>
          {renameState?.message && <p className="text-xs font-medium text-red-600">{renameState.message}</p>}
          {renameState?.done && <p className="text-xs font-medium text-green-700">Renamed.</p>}
        </form>
      )}
      {canCreate && (
        <form action={create} className="flex flex-col gap-1.5">
          <label htmlFor="new-version" className="text-xs font-medium text-slate-600">Start next quarter&apos;s set (a draft copy of the live one)</label>
          <div className="flex gap-2">
            <Input id="new-version" name="name" placeholder="e.g. 2027 Q1" maxLength={60} />
            <button type="submit" disabled={creating} className={buttonClasses()}>{creating ? "Creating…" : "Create draft"}</button>
          </div>
          {createState?.message && <p className="text-xs font-medium text-red-600">{createState.message}</p>}
        </form>
      )}
    </div>
  );
}
