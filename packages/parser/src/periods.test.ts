import { expect, test } from "bun:test";
import { detectMentions } from "./mentions";
import { detectPeriods } from "./periods";

/** A Wednesday, so week boundaries are visible in both directions. */
const NOW = new Date("2026-08-26T15:00:00");

const only = (content: string) => {
  const [period] = detectPeriods(content, NOW);
  if (!period) throw new Error(`nothing detected in ${JSON.stringify(content)}`);
  return period;
};

const day = (date: Date | null) => (date === null ? null : date.toISOString().slice(0, 10));

test("a trailing window reaches back from today", () => {
  const period = only("revisar o que mudou nas últimas 3 semanas");
  expect(day(period.start)).toBe("2026-08-05");
  expect(day(period.end)).toBe("2026-08-26");
  expect(period.direction).toBe("past");
  expect(period.grain).toBe("week");
});

test("the English trailing window reads the same", () => {
  const period = only("what happened in the past 2 months");
  expect(day(period.start)).toBe("2026-06-26");
  expect(period.grain).toBe("month");
});

test("a spelled amount counts", () => {
  expect(day(only("nos últimos dois dias").start)).toBe("2026-08-24");
});

test("last week is the whole week before this one", () => {
  const period = only("semana passada mexi no auth");
  expect(day(period.start)).toBe("2026-08-17");
  expect(day(period.end)).toBe("2026-08-23");
  expect(period.grain).toBe("week");
});

test("this week is the week today falls in", () => {
  const period = only("esta semana");
  expect(day(period.start)).toBe("2026-08-24");
  expect(day(period.end)).toBe("2026-08-30");
});

test("next week points forward", () => {
  const period = only("semana que vem falo com o João");
  expect(day(period.start)).toBe("2026-08-31");
  expect(period.direction).toBe("future");
});

test("last month is a calendar month", () => {
  const period = only("mês passado");
  expect(day(period.start)).toBe("2026-07-01");
  expect(day(period.end)).toBe("2026-07-31");
});

test("the month before last goes two back", () => {
  expect(day(only("semana retrasada").start)).toBe("2026-08-10");
});

test("the end of the month is its last stretch", () => {
  const period = only("no fim do mês");
  expect(day(period.start)).toBe("2026-08-21");
  expect(day(period.end)).toBe("2026-08-31");
});

test("recently is a fortnight", () => {
  const period = only("recentemente andei pensando nisso");
  expect(day(period.start)).toBe("2026-08-12");
  expect(period.grain).toBe("fuzzy");
});

test("a remembered span is a neighbourhood, not a date", () => {
  const period = only("faz uns 3 meses que comecei isso");
  expect(period.grain).toBe("fuzzy");
  expect(day(period.start)).toBe("2026-05-11");
  expect(day(period.end)).toBe("2026-06-10");
});

test("months ago reads in English too", () => {
  expect(only("three months ago").grain).toBe("fuzzy");
});

test("an event-relative span names its anchor and leaves the edge open", () => {
  const period = only("depois que comecei HEREZE tudo mudou");
  expect(period.anchor).toBe("HEREZE tudo mudou");
  expect(period.anchoredEdge).toBe("start");
  expect(period.start).toBeNull();
  expect(period.end).toEqual(NOW);
});

test("before a project anchors the far edge", () => {
  const period = only("antes do projeto HEREZE");
  expect(period.anchor).toBe("HEREZE");
  expect(period.anchoredEdge).toBe("end");
});

test("the clock's own words are never a name", () => {
  expect(detectPeriods("desde ontem", NOW)).toEqual([]);
});

test("a clock span beats a name that would have swallowed it", () => {
  const period = only("desde a semana passada");
  expect(period.anchor).toBeNull();
  expect(day(period.start)).toBe("2026-08-17");
});

test("naquela época names nothing", () => {
  expect(detectPeriods("naquela época eu usava outro editor", NOW)).toEqual([]);
});

test("one phrase yields one span", () => {
  expect(detectPeriods("nas últimas 3 semanas", NOW)).toHaveLength(1);
});

test("the same content always parses the same way", () => {
  const content = "semana passada mexi no auth, e no fim do mês eu volto nisso";
  expect(detectPeriods(content, NOW)).toEqual(detectPeriods(content, NOW));
});

test("mentions carry instants and spans in one list", () => {
  const mentions = detectMentions("semana passada mexi no auth, entrego até sexta", NOW);
  expect(mentions.map((mention) => mention.kind)).toEqual(["period", "deadline"]);
  expect(mentions[1]?.direction).toBe("future");
});

test("a span is not read a second time as the instant inside it", () => {
  const mentions = detectMentions("semana que vem", NOW);
  expect(mentions).toHaveLength(1);
  expect(mentions[0]?.kind).toBe("period");
});
