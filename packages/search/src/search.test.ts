import { expect, test } from "bun:test";
import type { Note } from "@echo/types";
import { combine, DEFAULT_WEIGHTS, normalizeLexical, rank, recencyScore } from "./index";

const NOW = new Date(2026, 7, 26, 12, 0, 0);

const note = (id: string, updatedAt = NOW): Note => {
  return {
    id,
    workspaceId: "00000000-0000-0000-0000-000000000001",
    folderId: null,
    title: id,
    content: id,
    archivedAt: null,
    createdAt: updatedAt,
    updatedAt,
  };
};

test("recency decays by half every two weeks", () => {
  expect(recencyScore(NOW, NOW)).toBe(1);
  expect(recencyScore(new Date(NOW.getTime() - 14 * 24 * 3600_000), NOW)).toBeCloseTo(0.5, 5);
  expect(recencyScore(new Date(NOW.getTime() - 28 * 24 * 3600_000), NOW)).toBeCloseTo(0.25, 5);
});

test("weights are the only thing deciding the blend", () => {
  const signals = { semantic: 1, lexical: 0, recency: 0, interaction: 0, context: 0 };
  expect(combine(signals, DEFAULT_WEIGHTS)).toBeCloseTo(DEFAULT_WEIGHTS.semantic, 5);
  expect(
    combine(signals, { semantic: 0, lexical: 1, recency: 0, interaction: 0, context: 0 }),
  ).toBe(0);
});

test("what the reader opens breaks ties, and only ties", () => {
  const tied = rank(
    [
      { note: note("ignored"), semantic: 1 },
      { note: note("opened-before"), semantic: 1, interaction: 1 },
    ],
    { now: NOW },
  );
  expect(tied[0]?.note.id).toBe("opened-before");

  // A note the reader keeps opening still loses to one that actually answers the question.
  const outranked = rank(
    [
      { note: note("familiar"), semantic: 0.5, interaction: 1 },
      { note: note("relevant"), semantic: 1 },
    ],
    { now: NOW },
  );
  expect(outranked[0]?.note.id).toBe("relevant");
});

test("recency and habit are tie-breakers, never a reason to be a result", () => {
  const results = rank(
    [
      { note: note("recent-but-unrelated"), semantic: 0, interaction: 1 },
      { note: note("actually-about-it"), semantic: 1 },
    ],
    { now: NOW, minimumSemantic: 0.5 },
  );

  expect(results.map((result) => result.note.id)).toEqual(["actually-about-it"]);
});

test("lexical scores are normalized against the best hit", () => {
  expect(normalizeLexical([0.5, 0.25, 0])).toEqual([1, 0.5, 0]);
  expect(normalizeLexical([0, 0])).toEqual([0, 0]);
});

test("meaning outranks word overlap", () => {
  const results = rank(
    [
      { note: note("lexical-only"), lexical: 1 },
      { note: note("semantic-match"), semantic: 1 },
    ],
    { now: NOW },
  );

  expect(results[0]?.note.id).toBe("semantic-match");
});

test("a note without an embedding still competes", () => {
  const results = rank([{ note: note("unembedded"), lexical: 1 }], { now: NOW });

  expect(results).toHaveLength(1);
  expect(results[0]?.semantic).toBe(0);
});

test("older notes rank behind equally relevant new ones", () => {
  const old = new Date(NOW.getTime() - 60 * 24 * 3600_000);
  const results = rank(
    [
      { note: note("old", old), semantic: 1 },
      { note: note("fresh", NOW), semantic: 1 },
    ],
    { now: NOW },
  );

  expect(results.map((result) => result.note.id)).toEqual(["fresh", "old"]);
});

test("ties break deterministically", () => {
  const candidates = [
    { note: note("b"), semantic: 1 },
    { note: note("a"), semantic: 1 },
  ];
  const first = rank(candidates, { now: NOW });
  const second = rank(candidates, { now: NOW });
  expect(first.map((r) => r.note.id)).toEqual(second.map((r) => r.note.id));
  expect(first[0]?.note.id).toBe("a");
});
