"use client";

import { cn } from "@/lib/utils";

/** One list of topics to pick favourites from (see services/topic.service). */
export type PreferenceCategory = { id: string; name: string; heading: string; description: string; required: number; topics: { id: string; title: string }[] };

/**
 * A category's topics as tick boxes, with a live "Selected: 4 / 10" count.
 * Once the number is reached the rest are locked until one is unticked.
 * `fieldKey` ("topics.<category id>") ties it to its error and focus.
 */
export function TopicPicker({
  category,
  picked,
  onToggle,
  error,
  fieldKey,
}: {
  category: PreferenceCategory;
  picked: string[];
  onToggle: (topicId: string) => void;
  error?: string;
  fieldKey: string;
}) {
  const full = picked.length >= category.required;
  return (
    <fieldset data-topics={fieldKey} className="mt-10" aria-describedby={`t-${category.id}-hint${error ? ` t-${category.id}-error` : ""}`}>
      <legend className="text-[19px] font-bold">
        {category.heading}
        <span aria-hidden className="text-red-700">*</span>
      </legend>
      {category.description && <p id={`t-${category.id}-hint`} className="mt-1 text-[15px] text-ink/70">{category.description}</p>}
      <p aria-live="polite" className={cn("mt-3 text-[15px] font-bold", full ? "text-green-800" : "text-tan")}>
        Selected: {picked.length} / {category.required}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {category.topics.map((topic) => {
          const checked = picked.includes(topic.id);
          const locked = !checked && full;
          return (
            <li key={topic.id}>
              <label
                className={cn(
                  "flex h-full items-start gap-3 rounded-xl border px-4 py-3 text-[16px] leading-snug transition-colors",
                  checked ? "border-amber bg-butter" : "border-field-line bg-paper",
                  locked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-amber",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked}
                  onChange={() => onToggle(topic.id)}
                  className="mt-0.5 size-5 shrink-0 accent-amber"
                />
                <span>{topic.title}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {error && <p id={`t-${category.id}-error`} className="mt-2 text-[14px] font-bold text-red-700">{error}</p>}
    </fieldset>
  );
}
