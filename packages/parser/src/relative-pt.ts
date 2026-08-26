import type { Parser, ParsingContext } from "chrono-node";

/**
 * The offsets chrono's Portuguese locale does not read. `amanhã` and `sexta` it handles; `em 3
 * dias`, `daqui a duas semanas` and `semana que vem` it returns nothing for — and `daqui a 3 dias`
 * it reads as three o'clock, which is worse than nothing.
 */

const UNITS: Record<string, "day" | "week" | "month" | "year"> = {
  dia: "day",
  dias: "day",
  semana: "week",
  semanas: "week",
  mes: "month",
  meses: "month",
  ano: "year",
  anos: "year",
};

/** Small numbers get written out far more often than large ones, so only small ones are spelled. */
const WORDS: Record<string, number> = {
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
};

const strip = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

const DAYS_IN = { day: 1, week: 7, month: 0, year: 0 } as const;

const shift = (from: Date, amount: number, unit: "day" | "week" | "month" | "year"): Date => {
  const date = new Date(from);
  if (unit === "month") date.setMonth(date.getMonth() + amount);
  else if (unit === "year") date.setFullYear(date.getFullYear() + amount);
  else date.setDate(date.getDate() + amount * DAYS_IN[unit]);
  return date;
};

const known = (date: Date) => ({
  day: date.getDate(),
  month: date.getMonth() + 1,
  year: date.getFullYear(),
});

/** `em 3 dias`, `daqui a duas semanas`, `dentro de um mês`. */
const offset: Parser = {
  pattern: () =>
    /\b(?:em|daqui\s+a|dentro\s+de)\s+(\d{1,3}|um|uma|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|quinze)\s+(dias?|semanas?|m[êe]s|meses|anos?)\b/iu,
  extract: (context: ParsingContext, match: RegExpMatchArray) => {
    const raw = strip(match[1] ?? "");
    const amount = WORDS[raw] ?? Number.parseInt(raw, 10);
    const unit = UNITS[strip(match[2] ?? "")];
    if (!unit || !Number.isFinite(amount) || amount < 1) return null;
    return known(shift(context.refDate, amount, unit));
  },
};

/** `semana que vem`, `próximo mês`, `ano que vem`. */
const next: Parser = {
  pattern: () =>
    /\b(?:(?:na|no)\s+)?(?:pr[óo]xim[ao]\s+(semana|m[êe]s|ano)|(semana|m[êe]s|ano)\s+que\s+vem)\b/iu,
  extract: (context: ParsingContext, match: RegExpMatchArray) => {
    const unit = UNITS[strip(match[1] ?? match[2] ?? "")];
    return unit ? known(shift(context.refDate, 1, unit)) : null;
  },
};

/** `depois de amanhã` — chrono reads only the `amanhã` inside it and lands a day early. */
const dayAfterTomorrow: Parser = {
  // `\b` is ASCII-only even under `u`, so an accented last letter needs the boundary spelled out.
  pattern: () => /\bdepois\s+de\s+amanh[ãa](?!\p{L})/iu,
  extract: (context: ParsingContext) => known(shift(context.refDate, 2, "day")),
};

export const PT_RELATIVE: Parser[] = [offset, next, dayAfterTomorrow];
