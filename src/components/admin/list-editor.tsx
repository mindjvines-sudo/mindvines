"use client";

import { useId, useState } from "react";
import { cloudinaryThumbnail } from "@/lib/cloudinary-url";
import { Input, Select, Textarea } from "@/components/admin/ui/form";
import { Button, buttonClasses } from "@/components/admin/ui/button";
import { MediaPickerModal } from "@/components/admin/media-picker";
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, PlusIcon, TrashIcon } from "@/components/admin/icons";
import type { MediaItem } from "@/types/media";

export type ListFieldConfig = {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  /** Picks an image from the media library; the row posts its id. */
  image?: { folder: string };
  /** A fixed set of choices, shown as a select. */
  options?: { value: string; label: string }[];
};

export type ListRowValue = string | MediaItem | null | undefined;
export type ListRowValues = Record<string, ListRowValue>;

type Row = { id: number; values: ListRowValues };

let nextRowId = 0;

/** A select always has a value, so only typed text and chosen images make a row count. */
function isFilled(fields: ListFieldConfig[], values: ListRowValues) {
  return fields.some((field) => {
    if (field.options) return false;
    const value = values[field.key];
    return field.image ? Boolean(value) : typeof value === "string" && value.trim() !== "";
  });
}

/** The posted shape of a list: empty rows dropped, images as their media ids. */
export function serialiseListRows(fields: ListFieldConfig[], rows: ListRowValues[], asStrings = false) {
  const filled = rows.filter((values) => isFilled(fields, values));
  if (asStrings) return filled.map((values) => String(values[fields[0].key] ?? "").trim());
  return filled.map((values) =>
    Object.fromEntries(
      fields.map((field) => {
        const value = values[field.key];
        if (field.image) return [field.key, value && typeof value === "object" ? value._id : ""];
        return [field.key, typeof value === "string" ? value : ""];
      })
    )
  );
}

/**
 * Edits a repeatable section of a form — an age group’s slides, stats or
 * testimonials — as a list of rows that can be added, removed and reordered. The whole list is posted as JSON through one
 * hidden input named `name`; empty rows are dropped. With `asStrings`, a
 * single-field list posts plain strings. Without `name`, nothing is posted
 * and `onChange` hands the list to a parent editor instead.
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
  onChange,
}: {
  name?: string;
  fields: ListFieldConfig[];
  initial?: ListRowValues[];
  addLabel: string;
  emptyText: string;
  max?: number;
  asStrings?: boolean;
  invalid?: boolean;
  onChange?: (value: unknown[]) => void;
}) {
  const baseId = useId();
  const [rows, setRows] = useState<Row[]>(() => initial.map((values) => ({ id: nextRowId++, values })));

  function commit(next: Row[]) {
    setRows(next);
    onChange?.(serialiseListRows(fields, next.map((row) => row.values), asStrings));
  }

  function update(id: number, key: string, value: ListRowValue) {
    commit(rows.map((row) => (row.id === id ? { ...row, values: { ...row.values, [key]: value } } : row)));
  }

  function move(index: number, offset: -1 | 1) {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(index + offset, 0, row);
    commit(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {name && (
        <input
          type="hidden"
          name={name}
          value={JSON.stringify(serialiseListRows(fields, rows.map((row) => row.values), asStrings))}
        />
      )}

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
              const ariaLabel = `${field.label} ${index + 1}`;
              const value = row.values[field.key];

              if (field.image) {
                return (
                  <RowImageField
                    key={field.key}
                    label={ariaLabel}
                    folder={field.image.folder}
                    value={value && typeof value === "object" ? value : null}
                    onChange={(media) => update(row.id, field.key, media)}
                  />
                );
              }

              const text = typeof value === "string" ? value : "";
              if (field.options) {
                return (
                  <Select
                    key={field.key}
                    id={inputId}
                    aria-label={ariaLabel}
                    value={text}
                    onChange={(event) => update(row.id, field.key, event.target.value)}
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              }

              const shared = { id: inputId, value: text, placeholder: field.placeholder, invalid, "aria-label": ariaLabel };
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
              onClick={() => commit(rows.filter((item) => item.id !== row.id))}
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
          onClick={() => commit([...rows, { id: nextRowId++, values: {} }])}
          className={buttonClasses({ variant: "secondary", size: "sm", className: "self-start" })}
        >
          <PlusIcon />
          {addLabel}
        </button>
      )}
    </div>
  );
}

/** A compact media picker for one row: a thumbnail beside its buttons. */
function RowImageField({
  label,
  folder,
  value,
  onChange,
}: {
  label: string;
  folder: string;
  value: MediaItem | null;
  onChange: (media: MediaItem | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin-only row thumbnail
        <img
          src={cloudinaryThumbnail(value.secureUrl, 160)}
          alt={value.altText ?? ""}
          className="size-14 shrink-0 rounded-lg border border-line bg-white object-cover"
        />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line bg-white text-slate-400">
          <ImageIcon className="size-5" />
        </span>
      )}
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)} aria-label={`${value ? "Change" : "Choose"} ${label}`}>
          {value ? "Change image" : "Choose image"}
        </Button>
        {value && (
          <Button variant="danger-soft" size="sm" onClick={() => onChange(null)} aria-label={`Remove ${label}`}>
            Remove
          </Button>
        )}
      </div>

      {isOpen && (
        <MediaPickerModal
          folder={folder}
          onClose={() => setIsOpen(false)}
          onSelect={(media) => {
            onChange(media);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}
