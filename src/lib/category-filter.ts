// A category tagged Home ("personal") shouldn't be pickable for a row marked
// Office and vice versa — that mismatch is what made rows categorised
// "Home - X" still show up as Office spend (or the reverse) elsewhere in the
// app, since category names carry the Home/Office label but the usage field
// is what everything else actually groups by. Categories with no default
// (Income/Investments) stay available either way. "shared" is a legacy usage
// value (no longer creatable) — rows still carrying it see every category, so
// old data isn't hidden. `currentId` (if given) always stays visible even if
// it wouldn't otherwise pass the filter, so an existing selection is never
// silently hidden.
export type CategoryWithUsage = { id: string; default_personal_or_office: string | null };

export function categoriesForUsage<T extends CategoryWithUsage>(
  categories: T[],
  usage: string,
  currentId?: string | null
): T[] {
  if (usage === "shared") return categories;
  return categories.filter(
    (c) => !c.default_personal_or_office || c.default_personal_or_office === usage || c.id === currentId
  );
}
