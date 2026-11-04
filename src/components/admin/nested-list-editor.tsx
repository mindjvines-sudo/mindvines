"use client";

import { useId, useState } from "react";
import { Field, Input, Textarea } from "@/components/admin/ui/form";
import { buttonClasses } from "@/components/admin/ui/button";
import { ListEditor, serialiseListRows, type ListFieldConfig, type ListRowValues } from "@/components/admin/list-editor";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";

type GroupField = { key: string; label: string; placeholder?: string; hint?: string; multiline?: boolean };

type ItemsConfig = {
  /** The key the group’s rows are posted under, e.g. "items" or "slides". */
  key: string;
  label: string;
  fields: ListFieldConfig[];
  addLabel: string;
  emptyText: string;
  max?: number;
};

export type NestedGroupValues = Record<string, string | ListRowValues[] | undefined>;

type Group = {
  id: number;
  values: Record<string, string>;
  /** Seeds the group’s row editor; never read again after mount. */
  initialItems: ListRowValues[];
  items: unknown[];
};

let nextGroupId = 0;

/**
 * Edits a list of groups that each hold their own list of rows: an age
 * group’s collections and their rows, or gallery tabs and their slides. Each
 * group’s text fields sit above a ListEditor for its rows; the whole thing
 * is posted as JSON through one hidden input named `name`.
 */
export function NestedListEditor({
  name,
  noun,
  fields,
  items,
  initial = [],
  addLabel,
  emptyText,
  max = 6,
  invalid,
}: {
  name: string;
  /** Labels each group, e.g. "Collection" → “Collection 2”. */
  noun: string;
  fields: GroupField[];
  items: ItemsConfig;
  initial?: NestedGroupValues[];
  addLabel: string;
  emptyText: string;
  max?: number;
  invalid?: boolean;
}) {
  const baseId = useId();
  const [groups, setGroups] = useState<Group[]>(() =>
    initial.map((group) => {
      const initialItems = (group[items.key] as ListRowValues[] | undefined) ?? [];
      const values = Object.fromEntries(fields.map((field) => [field.key, String(group[field.key] ?? "")]));
      return { id: nextGroupId++, values, initialItems, items: serialiseListRows(items.fields, initialItems) };
    })
  );

  const serialised = JSON.stringify(
    groups
      .filter((group) => group.items.length > 0 || Object.values(group.values).some((value) => value.trim()))
      // Every field is posted, typed into or not, so validation can name what's missing.
      .map((group) => ({
        ...Object.fromEntries(fields.map((field) => [field.key, group.values[field.key] ?? ""])),
        [items.key]: group.items,
      }))
  );

  function update(id: number, patch: Partial<Pick<Group, "values" | "items">>) {
    setGroups((current) => current.map((group) => (group.id === id ? { ...group, ...patch } : group)));
  }

  function move(index: number, offset: -1 | 1) {
    setGroups((current) => {
      const next = [...current];
      const [group] = next.splice(index, 1);
      next.splice(index + offset, 0, group);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={serialised} />

      {groups.length === 0 && (
        <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      )}

      {groups.map((group, index) => (
        <div
          key={group.id}
          role="group"
          aria-labelledby={`${baseId}-${group.id}-title`}
          className="flex flex-col gap-4 rounded-xl border border-line p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p id={`${baseId}-${group.id}-title`} className="text-sm font-semibold text-navy-900">
              {noun} {index + 1}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${noun.toLowerCase()} ${index + 1} up`}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                <ArrowUpIcon />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === groups.length - 1}
                aria-label={`Move ${noun.toLowerCase()} ${index + 1} down`}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                <ArrowDownIcon />
              </button>
              <button
                type="button"
                onClick={() => setGroups((current) => current.filter((item) => item.id !== group.id))}
                aria-label={`Remove ${noun.toLowerCase()} ${index + 1}`}
                className={buttonClasses({ variant: "ghost", size: "sm", className: "text-red-600" })}
              >
                <TrashIcon />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const id = `${baseId}-${group.id}-${field.key}`;
              const props = {
                id,
                value: group.values[field.key] ?? "",
                placeholder: field.placeholder,
                invalid,
              };
              const onChange = (value: string) => update(group.id, { values: { ...group.values, [field.key]: value } });
              return (
                <Field key={field.key} label={field.label} htmlFor={id} hint={field.hint} className={field.multiline ? "sm:col-span-2" : undefined}>
                  {field.multiline ? (
                    <Textarea rows={2} {...props} onChange={(event) => onChange(event.target.value)} />
                  ) : (
                    <Input {...props} onChange={(event) => onChange(event.target.value)} />
                  )}
                </Field>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-medium text-slate-700">{items.label}</p>
            <ListEditor
              fields={items.fields}
              initial={group.initialItems}
              addLabel={items.addLabel}
              emptyText={items.emptyText}
              max={items.max}
              invalid={invalid}
              onChange={(value) => update(group.id, { items: value })}
            />
          </div>
        </div>
      ))}

      {groups.length < max && (
        <button
          type="button"
          onClick={() =>
            setGroups((current) => [...current, { id: nextGroupId++, values: {}, initialItems: [], items: [] }])
          }
          className={buttonClasses({ variant: "secondary", size: "sm", className: "self-start" })}
        >
          <PlusIcon />
          {addLabel}
        </button>
      )}
    </div>
  );
}
