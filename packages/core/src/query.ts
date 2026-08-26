import { detectPeriods } from "@echo/parser";
import { type Anchors, resolveMention } from "./temporal";

/**
 * A question, taken apart. "Notes about auth from last month in my work projects" is four different
 * questions wearing one coat: a subject, a stretch of time, a place, and a lot of connective tissue
 * that means nothing on its own.
 *
 * Everything here is deterministic and reversible. Every filter it finds is handed back with the
 * words it came from, because a filter the reader cannot see is a filter that hides their answer,
 * and one they cannot remove is worse.
 */

/** Somewhere the reader made: a folder or a category, by the name they gave it. */
export type Place = { kind: "folder" | "category"; id: string; name: string };

export type QueryPeriod = { text: string; from: Date | null; to: Date | null };

export type ParsedQuery = {
  /** What is actually being asked, once the filters and the framing are out of the way. */
  terms: string;
  /** The stretch of time the question named, resolved. */
  period: QueryPeriod | null;
  /** The place it named. */
  place: Place | null;
  /**
   * The words that turned out to be a way of asking rather than part of the question — "aquela ideia
   * que eu tive sobre", "a note where I was". Kept so the interface can say what it took out.
   */
  framing: string | null;
};

/**
 * How people refer to their own notes when they cannot remember the words in them. None of this is
 * the question; all of it is a person circling the question.
 *
 * Order matters: the longest way of saying it is tried first, so "aquela ideia que eu tive sobre"
 * is not read as "aquela ideia" with three stray words after it.
 */
const FRAMING: RegExp[] = [
  // Portuguese
  /^\s*(?:aquela|aquele|aquilo)\s+(?:ideia|nota|coisa|treco|lance)?\s*(?:que\s+eu\s+(?:tive|escrevi|fiz|anotei))?\s*(?:sobre|de|do|da|onde)\s+/iu,
  /^\s*(?:uma?|a)\s+nota\s+(?:onde|em\s+que)\s+eu\s+(?:tava|estava|fiquei|andava)\s+\p{L}+\s+(?:com|de|sobre)\s+/iu,
  /^\s*quando\s+eu\s+(?:tava|estava|andava)\s+(?:pensando|mexendo|trabalhando)\s+(?:em|no|na|com)\s+/iu,
  /^\s*(?:me\s+)?(?:mostra|acha|procura|lembra)\s+(?:a\s+|as\s+|o\s+|os\s+)?(?:nota|notas)?\s*(?:sobre|de|do|da)\s+/iu,
  /^\s*(?:alguma\s+coisa|algo)\s+(?:sobre|de|a\s+ver\s+com)\s+/iu,
  /^\s*(?:notas?)\s+(?:sobre|de|do|da)\s+/iu,
  // English
  /^\s*that\s+(?:idea|note|thing)\s*(?:I\s+(?:had|wrote|made))?\s*(?:about|on|where)\s+/iu,
  /^\s*(?:a|the)\s+note\s+where\s+I\s+(?:was|got)\s+\p{L}+\s+(?:about|at|with)\s+/iu,
  /^\s*when\s+I\s+was\s+(?:thinking|working)\s+(?:about|on)\s+/iu,
  /^\s*(?:show\s+me|find|search\s+for)\s+(?:the\s+)?(?:notes?)?\s*(?:about|on|from)\s+/iu,
  /^\s*something\s+about\s+/iu,
  /^\s*notes?\s+(?:about|on)\s+/iu,
];

/** Words that only ever join a question to its filters. Left in, they become the search itself. */
const CONNECTIVE =
  /^(?:in|on|at|from|my|the|a|an|of|for|and|em|no|na|nos|nas|do|da|dos|das|de|meu|minha|meus|minhas|os|as|o|a|e|projeto|projetos|pasta|pastas|project|projects|folder|folders|note|notes|nota|notas)$/iu;

const trim = (text: string): string => text.trim().replace(/\s+/g, " ");

/** Connective words at either end are scaffolding; in the middle they may be part of the question. */
const shed = (text: string): string => {
  let words = trim(text).split(" ").filter(Boolean);
  while (words.length > 0 && CONNECTIVE.test(words[0] as string)) words = words.slice(1);
  while (words.length > 0 && CONNECTIVE.test(words[words.length - 1] as string)) {
    words = words.slice(0, -1);
  }
  return words.join(" ");
};

/**
 * Accents and case removed, and *only* those: this is used to find a position in the original text,
 * so it must not change the string's length. `foldName` collapses whitespace, which would slide
 * every index after it.
 *
 * NFD followed by dropping the combining marks is length-preserving for the precomposed accents a
 * name is actually written with.
 */
const flatten = (text: string): string =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Cuts a span out of the text and closes the gap. */
const excise = (text: string, at: number, length: number): string =>
  `${text.slice(0, at)} ${text.slice(at + length)}`;

/**
 * The longest place name the question mentions. Longest first, so a folder called "Work" never wins
 * over one called "Work / Frontend" when both are named.
 */
const findPlace = (
  text: string,
  places: readonly Place[],
): { place: Place; at: number; length: number } | null => {
  const haystack = flatten(text);
  let best: { place: Place; at: number; length: number } | null = null;

  for (const place of places) {
    const name = flatten(place.name).trim();
    if (name.length < 2) continue;
    // Nearly every place fails on the substring, so the pattern is built only for the few that
    // could match at all — a reader with a hundred folders is not worth a hundred compilations.
    if (!haystack.includes(name)) continue;
    // Whole words only: a category called "auth" must not be found inside "author".
    const at = haystack.search(
      new RegExp(`(?<![\\p{L}\\p{N}])${literal(name)}(?![\\p{L}\\p{N}])`, "u"),
    );
    if (at < 0) continue;
    if (!best || name.length > best.length) best = { place, at, length: name.length };
  }

  return best;
};

/** Place names are the reader's own text, so they never become a pattern unescaped. */
const literal = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type ParseQueryOptions = {
  now?: Date;
  /** Every folder and category the reader has made, so a question can name one. */
  places?: readonly Place[];
  /** Project start dates, for a question anchored to one — "desde que comecei HEREZE". */
  anchors?: Anchors;
};

/**
 * Takes a question apart into what is being asked and what is being asked *of*.
 *
 * Nothing is dropped silently: `terms` is what remains, and every filter carries the words that
 * produced it so the interface can show them and let them go.
 */
export const parseQuery = (
  query: string,
  { now = new Date(), places = [], anchors }: ParseQueryOptions = {},
): ParsedQuery => {
  let rest = query;

  // Framing first. It sits at the front and would otherwise be read as the question.
  let framing: string | null = null;
  for (const pattern of FRAMING) {
    const match = pattern.exec(rest);
    if (!match) continue;
    framing = trim(match[0]);
    rest = rest.slice(match[0].length);
    break;
  }

  // Then time, because a period's own words ("last month") contain connectives the place search
  // would otherwise trip over.
  let period: QueryPeriod | null = null;
  const [found] = detectPeriods(rest, now);
  if (found) {
    const resolved = anchors ? resolveMention({ ...found, kind: "period" }, anchors) : found;
    // A span anchored to a project the corpus never heard of is dropped rather than guessed at,
    // and dropping it must not also delete the words the reader typed.
    if (resolved) {
      period = { text: found.text, from: resolved.start, to: resolved.end };
      rest = excise(rest, found.index, found.text.length);
    }
  }

  const place = findPlace(rest, places);
  if (place) rest = excise(rest, place.at, place.length);

  return {
    terms: shed(rest),
    period,
    place: place?.place ?? null,
    framing,
  };
};
