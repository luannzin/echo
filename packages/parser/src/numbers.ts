/**
 * The small numbers people write out instead of typing. Shared by every parser here, because
 * `daqui a duas semanas` and `nas últimas duas semanas` are the same two.
 */
const WORDS: Record<string, number> = {
  // Portuguese
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  quinze: 15,
  // English
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  fifteen: 15,
};

/**
 * "A few" and "a couple" are not counts, but they are how a span usually gets named. Three is what
 * a few means often enough to be worth reading, and the fuzz around it is wide enough to cover
 * being wrong.
 */
const VAGUE: Record<string, number> = {
  "a few": 3,
  "a couple": 2,
  "a couple of": 2,
  alguns: 3,
  algumas: 3,
  uns: 3,
  umas: 3,
};

/** Accents and case removed, so `três` and `tres` are one key. */
export const fold = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");

/** A written or spelled number, or `null` when the text is neither. */
export const parseAmount = (raw: string): number | null => {
  const folded = fold(raw);
  if (folded.length === 0) return null;
  const spelled = WORDS[folded] ?? VAGUE[folded];
  if (spelled !== undefined) return spelled;
  const digits = Number.parseInt(folded, 10);
  return Number.isFinite(digits) && digits > 0 ? digits : null;
};

/** Every spelling `parseAmount` understands, as a regex alternation for a pattern to embed. */
export const AMOUNT_PATTERN = [
  "\\d{1,3}",
  "a\\s+couple\\s+of",
  "a\\s+couple",
  "a\\s+few",
  ...Object.keys(WORDS).filter((word) => word !== "a" && word !== "an"),
  ...Object.keys(VAGUE).filter((word) => !word.startsWith("a ")),
  "tr[êe]s",
  "an?",
].join("|");
