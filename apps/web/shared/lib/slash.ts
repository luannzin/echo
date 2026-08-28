import {
  CalendarClock,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  type LucideIcon,
  Minus,
  SquareCheck,
  Tag,
  TextQuote,
} from "lucide-react";
import { copy, type Dictionary } from "@/shared/lib/i18n";

/**
 * What a command does when it is chosen.
 *
 * The markdown ones write markdown — the characters, not a style. A heading in echo is a note that
 * has `#` at the start of a line, so it survives being copied out, read in another editor, or
 * exported to a file, and there is no second representation to keep in step with the words.
 */
export type SlashAction =
  /** Puts a prefix on the line the caret is in. Applying it twice does not stack it. */
  | { kind: "prefix"; prefix: string }
  /** Replaces the command with a piece of text, and says where the caret lands inside it. */
  | { kind: "insert"; text: string; caret: number }
  /** Changes what the note *is* rather than what it says. The words are left alone. */
  | { kind: "note"; note: "task" | "due" | "category" };

/** Where a command's words live. The words themselves are read at render, never captured here. */
type SlashKey = keyof Dictionary["slash"];

export type SlashCommand = {
  id: string;
  /**
   * The dictionary key its name lives under, rather than the name.
   *
   * This is a module-level constant, so a label stored here would be whichever language happened to
   * be active when the module was first evaluated — and it would stay that language for the life of
   * the window.
   */
  label: SlashKey;
  /**
   * What it writes, shown beside the label — the markdown itself, because that is the point. The
   * three commands that file something have words there instead, so those name a key.
   */
  hint: string | { key: SlashKey };
  /** Both languages: this is a filter over what someone reaches for, not UI copy. */
  keywords: string;
  icon: LucideIcon;
  action: SlashAction;
  /** Reads the rest of the line as an argument instead of ending at the first space. */
  takes?: "date" | "name";
};

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {
    id: "h1",
    label: "h1",
    hint: "#",
    keywords: "heading title h1 big titulo cabecalho",
    icon: Heading1,
    action: { kind: "prefix", prefix: "# " },
  },
  {
    id: "h2",
    label: "h2",
    hint: "##",
    keywords: "heading subheading h2 subtitulo",
    icon: Heading2,
    action: { kind: "prefix", prefix: "## " },
  },
  {
    id: "h3",
    label: "h3",
    hint: "###",
    keywords: "heading h3 small subtitulo menor",
    icon: Heading3,
    action: { kind: "prefix", prefix: "### " },
  },
  {
    id: "todo",
    label: "todo",
    hint: "- [ ]",
    keywords: "todo checkbox task check tarefa caixa marcar",
    icon: SquareCheck,
    action: { kind: "prefix", prefix: "- [ ] " },
  },
  {
    id: "list",
    label: "bullet",
    hint: "-",
    keywords: "list bullet item lista marcador",
    icon: List,
    action: { kind: "prefix", prefix: "- " },
  },
  {
    id: "numbered",
    label: "numbered",
    hint: "1.",
    keywords: "list numbered ordered lista numerada ordenada",
    icon: ListOrdered,
    action: { kind: "prefix", prefix: "1. " },
  },
  {
    id: "quote",
    label: "quote",
    hint: ">",
    keywords: "quote blockquote citation citacao",
    icon: TextQuote,
    action: { kind: "prefix", prefix: "> " },
  },
  {
    id: "code",
    label: "code",
    hint: "```",
    keywords: "code block fence snippet codigo bloco",
    icon: Code,
    // The caret lands on the empty line between the fences, which is where you were going.
    action: { kind: "insert", text: "```\n\n```\n", caret: 4 },
  },
  {
    id: "divider",
    label: "divider",
    hint: "---",
    keywords: "divider rule separator line divisor linha separador",
    icon: Minus,
    action: { kind: "insert", text: "---\n", caret: 4 },
  },
  {
    id: "task",
    label: "task",
    hint: { key: "taskHint" },
    keywords: "task todo do file tarefa fazer",
    icon: SquareCheck,
    action: { kind: "note", note: "task" },
  },
  {
    id: "due",
    label: "due",
    hint: { key: "dueHint" },
    keywords: "due date deadline when prazo data vencimento quando",
    icon: CalendarClock,
    action: { kind: "note", note: "due" },
    takes: "date",
  },
  {
    id: "category",
    label: "category",
    hint: { key: "categoryHint" },
    keywords: "category label tag topic categoria etiqueta rotulo",
    icon: Tag,
    action: { kind: "note", note: "category" },
    takes: "name",
  },
];

const byId = new Map(SLASH_COMMANDS.map((command) => [command.id, command]));

/** What a row is called, in the language on screen. */
export const slashLabel = (command: SlashCommand): string => copy().slash[command.label];

/** What it writes, beside the name: markdown as itself, and words through the dictionary. */
export const slashHint = (command: SlashCommand): string =>
  typeof command.hint === "string" ? command.hint : copy().slash[command.hint.key];

/**
 * What a `note` command asks to be filed against a note. Deliberately not a whole note patch: these
 * are the three things a writer can state outright, and everything else about a note is still read
 * out of its words or chosen somewhere it can be seen.
 */
export type Filing = { task?: true; dueAt?: Date; category?: string };

/** What the writer has typed after a `/`, taken apart. */
export type SlashQuery = {
  /** Where the `/` itself is. */
  start: number;
  /** What follows it, up to the first space. */
  name: string;
  /** The rest of the line, for the commands that take one. Null where none has been typed. */
  argument: string | null;
};

/** The start of the line `at` falls on. */
export const lineStartAt = (text: string, at: number): number => text.lastIndexOf("\n", at - 1) + 1;

/**
 * The command being typed under the caret, or null for the overwhelming majority of keystrokes,
 * which are somebody writing.
 *
 * A `/` only opens the menu at the start of a line or after a space — mid-word it is a date, a
 * fraction or a path, and a menu over those is a menu in the way. A space normally closes it,
 * because `/n something` is a sentence; the two commands that take an argument are the exception,
 * and only for as long as the line lasts.
 */
export const readSlash = (text: string, caret: number): SlashQuery | null => {
  const from = lineStartAt(text, caret);
  const line = text.slice(from, caret);
  const slash = line.lastIndexOf("/");
  if (slash === -1) return null;

  const before = line[slash - 1];
  if (slash > 0 && before !== undefined && !/\s/.test(before)) return null;

  const raw = line.slice(slash + 1);
  const space = raw.indexOf(" ");
  const start = from + slash;
  if (space === -1) return { start, name: raw, argument: null };

  const name = raw.slice(0, space);
  return byId.get(name)?.takes === undefined
    ? null
    : { start, name, argument: raw.slice(space + 1) };
};

/**
 * The commands worth showing for what has been typed. Matched on the start of a word rather than
 * anywhere inside one: on a substring, `/h` offered the divider and the to-do, because both happen
 * to contain the letter somewhere. An exact id always leads, so `/code` is the code block rather
 * than whichever command mentions the word first.
 */
export const matching = (name: string): SlashCommand[] => {
  const needle = name.trim().toLowerCase();
  if (needle.length === 0) return [...SLASH_COMMANDS];
  return SLASH_COMMANDS.filter((command) =>
    `${command.id} ${slashLabel(command).toLowerCase()} ${command.keywords}`
      .split(/[\s-]+/)
      .some((word) => word.startsWith(needle)),
  ).sort((a, b) => Number(b.id === needle) - Number(a.id === needle));
};

/** What the surface should say, and where the caret should sit in it. */
export type Applied = { text: string; caret: number };

/**
 * Whether choosing this command should ask for its words rather than run. Pressing Enter on
 * `/category` is choosing the command, not filing an unnamed category — so it becomes a second
 * step instead of an error message.
 */
export const needsArgument = (command: SlashCommand, query: SlashQuery): boolean =>
  command.takes !== undefined && (query.argument ?? "").trim().length === 0;

/**
 * The command written out in full with a space after it, waiting for what it takes. Whatever was
 * typed towards its name is replaced, so `/cat` becomes `/category ` with the caret at the end.
 */
export const openArgument = (
  text: string,
  query: SlashQuery,
  caret: number,
  command: SlashCommand,
): Applied => {
  const written = `/${command.id} `;
  return {
    text: text.slice(0, query.start) + written + text.slice(caret),
    caret: query.start + written.length,
  };
};

/**
 * Runs a command against the text it was typed into. The command itself always disappears — nobody
 * wants `/h1` left in their note — and a `note` command changes nothing else, because what it does
 * happens to the note rather than to the words.
 */
export const applyCommand = (
  text: string,
  query: SlashQuery,
  caret: number,
  command: SlashCommand,
): Applied => {
  const cut = text.slice(0, query.start) + text.slice(caret);

  if (command.action.kind === "insert") {
    const { text: written, caret: lands } = command.action;
    return {
      text: cut.slice(0, query.start) + written + cut.slice(query.start),
      caret: query.start + lands,
    };
  }

  if (command.action.kind === "prefix") {
    const { prefix } = command.action;
    const from = lineStartAt(cut, query.start);
    // Asking twice for a heading is asking for a heading, not for `## ` under a `# `.
    if (cut.slice(from).startsWith(prefix)) return { text: cut, caret: query.start };
    return {
      text: cut.slice(0, from) + prefix + cut.slice(from),
      caret: query.start + prefix.length,
    };
  }

  return { text: cut, caret: query.start };
};
