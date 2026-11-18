"use client";

import { useState, useTransition } from "react";
import { menuGroupLinks, type MenuAgePage, type MenuChildConfig, type MenuConfigItem } from "@/lib/content";
import { Card } from "@/components/admin/ui/card";
import { Alert } from "@/components/admin/ui/feedback";
import { buttonClasses } from "@/components/admin/ui/button";
import { inputClasses } from "@/components/admin/ui/form";
import { saveMenuAction } from "./actions";

export function MenuEditor({ initial, defaults, agePages, canEdit }: { initial: MenuConfigItem[]; defaults: MenuConfigItem[]; agePages: MenuAgePage[]; canEdit: boolean }) {
  const [items, setItems] = useState<MenuConfigItem[]>(initial);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ error?: string; success?: boolean }>({});
  const disabled = !canEdit || pending;

  const update = (index: number, patch: Partial<MenuConfigItem>) => setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const updateChild = (index: number, ageGroup: string, patch: Partial<MenuChildConfig>) => {
    setItems((list) => list.map((item, i) => {
      if (i !== index) return item;
      const children = [...(item.children ?? [])];
      const childIndex = children.findIndex((child) => child.ageGroup === ageGroup);
      if (childIndex < 0) children.push({ ageGroup, ...patch });
      else children[childIndex] = { ...children[childIndex], ...patch };
      return { ...item, children };
    }));
  };
  const move = (index: number, by: -1 | 1) =>
    setItems((list) => {
      const target = index + by;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  function save(list: MenuConfigItem[], restore = false) {
    setStatus({});
    start(async () => {
      try {
        const result = (await saveMenuAction(list)) ?? {};
        setStatus(result);
        if (result.success && restore) setItems(defaults);
      } catch {
        setStatus({ error: "The menu could not be saved. Please try again." });
      }
    });
  }

  return (
    <Card className="max-w-4xl p-5 sm:p-6">
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={index} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-start">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Name
              <input value={item.label} onChange={(e) => update(index, { label: e.target.value })} maxLength={60} disabled={disabled} className={inputClasses(false, "h-10")} />
            </label>
            {item.kind === "link" ? (
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                Link
                <input value={item.href} onChange={(e) => update(index, { href: e.target.value })} placeholder="/page or https://…" maxLength={300} disabled={disabled} className={inputClasses(false, "h-10")} />
              </label>
            ) : (
              <p className="text-xs text-slate-500 sm:pt-6">Edit the dropdown links below. These appear when visitors expand this menu item.</p>
            )}
            <div className="flex items-center gap-1 sm:pt-5">
              <label className="mr-2 flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={!item.hidden} onChange={(e) => update(index, { hidden: !e.target.checked })} disabled={disabled} /> Show
              </label>
              <button type="button" onClick={() => move(index, -1)} disabled={disabled || index === 0} aria-label={`Move ${item.label} up`} className={buttonClasses({ variant: "ghost", size: "sm" })}>↑</button>
              <button type="button" onClick={() => move(index, 1)} disabled={disabled || index === items.length - 1} aria-label={`Move ${item.label} down`} className={buttonClasses({ variant: "ghost", size: "sm" })}>↓</button>
              {item.kind === "link" && (
                <button type="button" onClick={() => setItems((list) => list.filter((_, i) => i !== index))} disabled={disabled} className={buttonClasses({ variant: "danger-soft", size: "sm" })}>Remove</button>
              )}
            </div>
            {item.kind !== "link" && (
              <fieldset disabled={disabled} className="min-w-0 rounded-lg bg-slate-50 p-3 sm:col-span-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Dropdown links</legend>
                <div className="flex flex-col gap-3">
                  {menuGroupLinks(item, agePages).map((child) => (
                    <div key={child.ageGroup} className="grid min-w-0 gap-3 sm:grid-cols-[1fr_1.4fr]">
                      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
                        Name — ages {child.ageGroup}
                        <input value={child.label} onChange={(e) => updateChild(index, child.ageGroup, { label: e.target.value })} maxLength={60} className={inputClasses(false, "h-10")} />
                      </label>
                      <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-600">
                        Link — ages {child.ageGroup}
                        <input value={child.href} onChange={(e) => updateChild(index, child.ageGroup, { href: e.target.value })} placeholder="/page or https://…" maxLength={300} className={inputClasses(false, "h-10")} />
                      </label>
                    </div>
                  ))}
                  {item.kind === "topics" && agePages.length === 0 && (
                    <p className="text-xs text-slate-500">Publish an age-group page with a subscription age group to edit its topic link here.</p>
                  )}
                  {canEdit && (item.children?.length ?? 0) > 0 && (
                    <button type="button" onClick={() => update(index, { children: undefined })} className={buttonClasses({ variant: "ghost", size: "sm", className: "self-start" })}>Reset age-group links</button>
                  )}
                </div>
              </fieldset>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setItems((list) => [...list, { kind: "link", label: "", href: "" }])} disabled={pending || items.length >= 20} className={buttonClasses({ variant: "secondary" })}>Add link</button>
          <button type="button" onClick={() => save(items)} disabled={pending} className={buttonClasses({ variant: "primary" })}>{pending ? "Saving…" : "Save menu"}</button>
          <button type="button" onClick={() => save([], true)} disabled={pending} className={buttonClasses({ variant: "ghost" })}>Restore default menu</button>
        </div>
      )}
      <div aria-live="polite" className="mt-4">
        {status.error && <Alert tone="error">{status.error}</Alert>}
        {status.success && <p className="text-sm font-medium text-emerald-700">Saved. The website menu is updated.</p>}
      </div>
    </Card>
  );
}
