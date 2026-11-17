"use client";

import { useState, useTransition } from "react";
import type { MenuConfigItem } from "@/lib/content";
import { Card } from "@/components/admin/ui/card";
import { Alert } from "@/components/admin/ui/feedback";
import { buttonClasses } from "@/components/admin/ui/button";
import { inputClasses } from "@/components/admin/ui/form";
import { saveMenuAction } from "./actions";

const AUTO: Record<string, string> = {
  topics: "Links are built automatically from the published age group pages.",
  plans: "Links are built automatically from the subscription age groups.",
};

export function MenuEditor({ initial, defaults, canEdit }: { initial: MenuConfigItem[]; defaults: MenuConfigItem[]; canEdit: boolean }) {
  const [items, setItems] = useState<MenuConfigItem[]>(initial);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ error?: string; success?: boolean }>({});

  const update = (index: number, patch: Partial<MenuConfigItem>) => setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index: number, by: -1 | 1) =>
    setItems((list) => {
      const target = index + by;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  function save(list: MenuConfigItem[]) {
    setStatus({});
    start(async () => setStatus((await saveMenuAction(list)) ?? {}));
  }

  return (
    <Card className="max-w-4xl p-5 sm:p-6">
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-start">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Name
              <input value={item.label} onChange={(e) => update(index, { label: e.target.value })} maxLength={60} disabled={!canEdit} className={inputClasses(false, "h-10")} />
            </label>
            {item.kind === "link" ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Link
                <input value={item.href} onChange={(e) => update(index, { href: e.target.value })} placeholder="/page or https://…" maxLength={300} disabled={!canEdit} className={inputClasses(false, "h-10")} />
              </label>
            ) : (
              <p className="pt-6 text-xs text-slate-500">{AUTO[item.kind]}</p>
            )}
            <div className="flex items-center gap-1 sm:pt-5">
              <label className="mr-2 flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={!item.hidden} onChange={(e) => update(index, { hidden: !e.target.checked })} disabled={!canEdit} /> Show
              </label>
              <button type="button" onClick={() => move(index, -1)} disabled={!canEdit || index === 0} aria-label={`Move ${item.label} up`} className={buttonClasses({ variant: "ghost", size: "sm" })}>↑</button>
              <button type="button" onClick={() => move(index, 1)} disabled={!canEdit || index === items.length - 1} aria-label={`Move ${item.label} down`} className={buttonClasses({ variant: "ghost", size: "sm" })}>↓</button>
              {item.kind === "link" && (
                <button type="button" onClick={() => setItems((list) => list.filter((_, i) => i !== index))} disabled={!canEdit} className={buttonClasses({ variant: "danger-soft", size: "sm" })}>Remove</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setItems((list) => [...list, { kind: "link", label: "", href: "" }])} className={buttonClasses({ variant: "secondary" })}>Add link</button>
          <button type="button" onClick={() => save(items)} disabled={pending} className={buttonClasses({ variant: "primary" })}>{pending ? "Saving…" : "Save menu"}</button>
          <button type="button" onClick={() => { setItems(defaults); save([]); }} disabled={pending} className={buttonClasses({ variant: "ghost" })}>Restore default menu</button>
        </div>
      )}
      <div aria-live="polite" className="mt-4">
        {status.error && <Alert tone="error">{status.error}</Alert>}
        {status.success && <p className="text-sm font-medium text-emerald-700">Saved. The website menu is updated.</p>}
      </div>
    </Card>
  );
}
