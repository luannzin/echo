/**
 * Every place `needle` appears in `hay`, as offsets into `hay`. Case-insensitive and literal: a note
 * is prose, and a reader typing `(` into a find box means a bracket rather than a group.
 *
 * Matches do not overlap — "aa" is found once in "aaa", which is what every editor with this box in
 * it answers, and therefore what pressing Enter twice is expected to run out of.
 */
export const matchesOf = (hay: string, needle: string): readonly number[] => {
  if (needle.length === 0) return [];
  const haystack = hay.toLowerCase();
  const wanted = needle.toLowerCase();
  const found: number[] = [];
  for (
    let at = haystack.indexOf(wanted);
    at !== -1;
    at = haystack.indexOf(wanted, at + wanted.length)
  ) {
    found.push(at);
  }
  return found;
};
