import { expect, test } from "bun:test";
import { parse } from "./index";

/** A Wednesday, so weekday maths has a fixed reference. */
const NOW = new Date(2026, 7, 26, 10, 0, 0);
const on = (content: string) => parse(content, { now: NOW });

/** chrono carries a time of day; the assertions here care about the day it landed on. */
function dayOf(detected: { date: Date } | null | undefined): Date | undefined {
  if (!detected) return undefined;
  const day = new Date(detected.date);
  day.setHours(0, 0, 0, 0);
  return day;
}

test("reads relative days in both languages", () => {
  expect(dayOf(on("ship it tomorrow").dates[0])).toEqual(new Date(2026, 7, 27));
  expect(dayOf(on("terminar isso amanha").dates[0])).toEqual(new Date(2026, 7, 27));
  expect(dayOf(on("escrevi isso hoje").dates[0])).toEqual(new Date(2026, 7, 26));
});

test("a limit reads as a deadline, a mention does not", () => {
  const deadline = on("finish the auth refactor before Friday");
  expect(deadline.deadline?.kind).toBe("deadline");
  expect(dayOf(deadline.deadline)).toEqual(new Date(2026, 7, 28));

  expect(on("we talked about it on Friday").deadline).toBeNull();
});

test("accented Portuguese deadlines resolve", () => {
  const result = on("revisar os preços até sexta");
  expect(dayOf(result.deadline)).toEqual(new Date(2026, 7, 28));
  expect(result.deadline?.text).toBe("sexta");
});

test("numeric dates are read day-first", () => {
  expect(dayOf(on("entrega 12/03/2027").dates[0])).toEqual(new Date(2027, 2, 12));
  expect(dayOf(on("entrega 03/12").dates[0])).toEqual(new Date(2026, 11, 3));
  expect(on("versao 40/13 nao e data").dates).toHaveLength(0);
});

test("trailing punctuation never reaches the label", () => {
  expect(on("mandar tudo antes de sexta, sem falta").deadline?.text).toBe("sexta");
  expect(on("ship it before Friday.").deadline?.text).toBe("Friday");
});

test("phrases beyond a single word resolve too", () => {
  expect(dayOf(on("review this in two weeks").dates[0])).toEqual(new Date(2026, 8, 9));
  expect(dayOf(on("call them next monday").dates[0])).toEqual(new Date(2026, 7, 31));
});

test("one phrase yields one date, not one per language", () => {
  expect(on("finish before Friday").dates).toHaveLength(1);
});

test("checkboxes are certain, phrasing is not", () => {
  const explicit = on("- [ ] ship the parser");
  expect(explicit.tasks[0]).toEqual({ text: "ship the parser", confidence: 1 });

  const implied = on("preciso revisar o merchant system");
  expect(implied.tasks[0]?.text).toBe("revisar o merchant system");
  expect(implied.tasks[0]?.confidence).toBeLessThan(1);

  expect(on("a note about shipping things").tasks).toHaveLength(0);
});

test("keywords drop stopwords in both languages and rank by frequency", () => {
  const keywords = on(
    "cache invalidation in Next.js. The cache is the problem, and cache keys are the fix.",
  ).keywords;
  expect(keywords[0]).toBe("cache");
  expect(keywords).not.toContain("the");
  expect(on("preciso de uma nota sobre o sistema de estoque").keywords).not.toContain("de");
});

test("the same note parses the same way twice", () => {
  const content = "revisar auth antes de sexta\n- [ ] mandar o resumo";
  expect(JSON.stringify(on(content))).toBe(JSON.stringify(on(content)));
});
