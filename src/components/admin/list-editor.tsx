"use client";

import { useId, useState } from "react";
import { Input, Textarea } from "@/components/admin/ui/form";
import { buttonClasses } from "@/components/admin/ui/button";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";

type FieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
};

type Row = { id: number; values: Record<string, string> };

let nextRowId = 0;

/**
 * Edits a repeatable section of a form — a service’s benefits, steps or FAQs,
 * a clinic’s stats, reasons or FAQs —
 * as a list of rows that can be added, removed and reordered. The whole list
 * is posted as JSON through one hidden input named `name`; empty rows are
 * dropped. With `asStrings`, a single-field list posts plain strings.
 */
export function ListEditor({
  name,
  fields,
  initial = [],
  addLabel,
  emptyText,
  max = 20,
  asStrings = false,
  invalid,
}: {
  name: string;
  fields: FieldConfig[];
  initial?: Record<string, string>[];
  addLabel: string;
  emptyText: string;
  max?: number;
  asStrings?: boolean;
  invalid?: boolean;
}) {
  const baseId = useId();
  const [rows, setRows] = useState<Row[]>(() => initial.map((values) => ({ id: nextRowId++, values })));

  const filled = rows.filter((row) => fields.some((field) => row.values[field.key]?.trim()));
  const serialised = JSON.stringify(
    asStrings ? filled.map((row) => row.values[fields[0].key].trim()) : filled.map((row) => row.values),
  );

  function update(id: number, key: string, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, values: { ...row.values, [key]: value } } : row)));
  }

  function move(index: number, offset: -1 | 1) {
    setRows((current) => {
      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(index + offset, 0, row);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={serialised} />

      {rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      )}

      {rows.map((row, index) => (
        <div key={row.id} className="flex gap-3 rounded-lg border border-line bg-slate-50/60 p-3">
          <span className="mt-2 w-5 shrink-0 text-xs font-semibold tabular-nums text-slate-400">{index + 1}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {fields.map((field) => {
              const inputId = `${baseId}-${row.id}-${field.key}`;
              const shared = {
                id: inputId,
                value: row.values[field.key] ?? "",
                placeholder: field.placeholder,
                invalid,
                "aria-label": `${field.label} ${index + 1}`,
              };
              return field.multiline ? (
                <Textarea
                  key={field.key}
                  rows={2}
                  {...shared}
                  onChange={(event) => update(row.id, field.key, event.target.value)}
                />
              ) : (
                <Input key={field.key} {...shared} onChange={(event) => update(row.id, field.key, event.target.value)} />
              );
            })}
          </div>
          {/* Stacked beside multi-field rows, in a line beside single inputs. */}
          <div className={fields.length > 1 ? "flex shrink-0 flex-col gap-1" : "flex shrink-0 items-start gap-1"}>
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              aria-label={`Move item ${index + 1} up`}
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              <ArrowUpIcon />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === rows.length - 1}
              aria-label={`Move item ${index + 1} down`}
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              <ArrowDownIcon />
            </button>
            <button
              type="button"
              onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
              aria-label={`Remove item ${index + 1}`}
              className={buttonClasses({ variant: "ghost", size: "sm", className: "text-red-600" })}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      ))}

      {rows.length < max && (
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { id: nextRowId++, values: {} }])}
          className={buttonClasses({ variant: "secondary", size: "sm", className: "self-start" })}
        >
          <PlusIcon />
          {addLabel}
        </button>
      )}
    </div>
  );
}
