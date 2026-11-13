"use client";

import { useOptimistic, useState, useTransition } from "react";

export type SentTopic = { id: string; title: string; sent: boolean; sentAt?: string | null };

/**
 * A child's chosen topics with a tick for "already sent", so the same book or
 * topic isn't sent twice. Ticks show at once and are saved one topic at a time.
 */
export function TopicSentList({
  categoryId,
  topics,
  canEdit,
  action,
}: {
  categoryId: string;
  topics: SentTopic[];
  canEdit: boolean;
  action: (categoryId: string, topicId: string, sent: boolean) => Promise<{ ok: boolean }>;
}) {
  const [saved, setSaved] = useState(topics);
  const [shown, setShown] = useOptimistic(saved, (current, change: { id: string; sent: boolean }) =>
    current.map((topic) => (topic.id === change.id ? { ...topic, sent: change.sent } : topic))
  );
  const [error, setError] = useState("");
  const [, start] = useTransition();

  function toggle(topic: SentTopic, sent: boolean) {
    setError("");
    start(async () => {
      setShown({ id: topic.id, sent });
      const result = await action(categoryId, topic.id, sent).catch(() => ({ ok: false }));
      if (result.ok) setSaved((current) => current.map((item) => (item.id === topic.id ? { ...item, sent, sentAt: sent ? new Date().toISOString() : null } : item)));
      else setError("Couldn't save that change. Please try again.");
    });
  }

  const sentCount = shown.filter((topic) => topic.sent).length;
  return (
    <div className="px-5 pb-5">
      <p className="mb-2 text-xs text-slate-500" aria-live="polite">{sentCount} of {shown.length} already sent</p>
      <ul className="space-y-1.5">
        {shown.map((topic) => (
          <li key={topic.id}>
            <label className="flex items-start gap-2.5 text-sm text-navy-900">
              <input
                type="checkbox"
                checked={topic.sent}
                disabled={!canEdit}
                onChange={(event) => toggle(topic, event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-teal-700"
              />
              <span className={topic.sent ? "text-slate-500 line-through" : undefined}>
                {topic.title}
                {topic.sent && <span className="ml-2 text-xs font-medium text-emerald-700 no-underline">Sent{topic.sentAt ? ` ${new Date(topic.sentAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })}` : ""}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
