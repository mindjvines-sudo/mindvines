/** How many favourite topics a child picks from a category, unless the category sets its own number. */
export const TOPIC_PICKS = 10;

/**
 * Quarterly topic sets. One version is ACTIVE (what new registrations choose
 * from); the next quarter's is prepared as a DRAFT and published when ready,
 * which archives the old one. Archived topics stay, so earlier choices keep
 * their meaning.
 */
export const TOPIC_VERSION_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type TopicVersionStatus = (typeof TOPIC_VERSION_STATUSES)[number];

/** A list shorter than the category's number asks for every topic in it. */
export function requiredPicks(available: number, limit = TOPIC_PICKS) {
  return Math.min(limit, available);
}

/**
 * Checks one category's picks against the topics on offer: no repeats,
 * nothing that isn't on the list, and exactly the number required. Returns an
 * error message, or null when the picks are fine.
 */
export function checkTopicPicks(picks: string[], availableIds: string[], limit = TOPIC_PICKS): string | null {
  const required = requiredPicks(availableIds.length, limit);
  const offered = new Set(availableIds);
  if (new Set(picks).size !== picks.length) return "Each topic can only be picked once.";
  if (picks.some((id) => !offered.has(id))) return "Some of these topics are no longer available. Please pick again.";
  if (picks.length !== required) return `Pick ${required} topics (${picks.length} chosen).`;
  return null;
}
