import { expect, test } from "bun:test";
import type { Note } from "@echo/types";
import {
  contextScore,
  DEFAULT_CONTEXT_WEIGHTS,
  explainContext,
  overlap,
  samePeriod,
} from "./context";
import { DEFAULT_WEIGHTS, rank } from "./index";

const NOW = new Date(2026, 7, 26, 12, 0, 0);

const note = (id: string, updatedAt = NOW): Note => ({
  id,
  workspaceId: "00000000-0000-0000-0000-000000000001",
  folderId: null,
  title: id,
  content: id,
  archivedAt: null,
  createdAt: updatedAt,
  updatedAt,
});

test("nothing known contributes nothing, rather than a guess", () => {
  expect(contextScore({})).toBe(0);
});

test("every signal together is the whole of the score", () => {
  const whole = contextScore({
    sameProject: true,
    sharedConcepts: 1,
    samePeriod: true,
    coOpened: 1,
  });
  const weights = Object.values(DEFAULT_CONTEXT_WEIGHTS).reduce((sum, w) => sum + w, 0);
  expect(whole).toBeCloseTo(weights, 5);
});

test("two unlabelled notes have nothing in common, not everything", () => {
  expect(overlap([], [])).toBe(0);
  expect(overlap(["auth"], [])).toBe(0);
  expect(overlap(["auth", "cache"], ["auth"])).toBeCloseTo(0.5, 5);
  expect(overlap(["auth"], ["auth"])).toBe(1);
});

test("a fortnight is the same stretch of work; two months is not", () => {
  expect(samePeriod(NOW, new Date(NOW.getTime() - 10 * 24 * 3600_000))).toBe(true);
  expect(samePeriod(NOW, new Date(NOW.getTime() - 60 * 24 * 3600_000))).toBe(false);
});

test("belonging can outrank meaning, and only by so much", () => {
  // The note this reader always opens beside the one they are reading, from the same project,
  // about the same things — against one that reads closer and belongs to nothing.
  const belongs = contextScore({
    sameProject: true,
    sharedConcepts: 1,
    samePeriod: true,
    coOpened: 1,
  });

  const results = rank(
    [
      { note: note("closer-but-unrelated"), semantic: 0.87 },
      { note: note("further-but-belongs"), semantic: 0.7, context: belongs },
    ],
    { now: NOW },
  );
  expect(results[0]?.note.id).toBe("further-but-belongs");

  // Seventeen points of meaning is more than the whole of belonging can make up.
  const outranked = rank(
    [
      { note: note("far-ahead"), semantic: 1 },
      { note: note("belongs"), semantic: 0.55, context: belongs },
    ],
    { now: NOW },
  );
  expect(outranked[0]?.note.id).toBe("far-ahead");
});

test("context is worth less than meaning on its own", () => {
  expect(DEFAULT_WEIGHTS.context).toBeLessThan(DEFAULT_WEIGHTS.semantic);
});

test("the reasons name which signals were true, never a score", () => {
  expect(explainContext({ sameProject: true, coOpened: 0.4 })).toEqual([
    "same-project",
    "co-opened",
  ]);
  expect(explainContext({})).toEqual([]);
});
