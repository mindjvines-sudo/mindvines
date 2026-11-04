// Mongoose types a populated ref by its declared ObjectId type rather than the
// shape it becomes after `.populate()`, so these mirror src/types/media.ts:
// take `unknown` and assert explicitly instead of fighting the inference.

/** A Category or Tag as returned by `.populate("<ref>", "name slug")`. */
export type PopulatedTerm = { name: string; slug: string };

export function asPopulatedTerm(value: unknown): PopulatedTerm | null {
  if (value && typeof value === "object" && "slug" in value && "name" in value) {
    return value as PopulatedTerm;
  }
  return null;
}

export function asPopulatedTerms(value: unknown): PopulatedTerm[] {
  if (!Array.isArray(value)) return [];
  return value.map(asPopulatedTerm).filter((term): term is PopulatedTerm => term !== null);
}

/** The author as returned by `.populate("author", "name")`. */
export function asPopulatedAuthor(value: unknown): { name: string } | null {
  if (value && typeof value === "object" && "name" in value) {
    return value as { name: string };
  }
  return null;
}

/** A term plus how many published posts carry it — sidebar category/tag lists. */
export type TermWithCount = PopulatedTerm & { count: number };
