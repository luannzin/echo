import { expect, test } from "bun:test";
import type { Note } from "@echo/types";
import { combine, DEFAULT_WEIGHTS, normalizeLexical, rank, recencyScore, relatedTo } from "./index";

const NOW = new Date(2026, 7, 26, 12, 0, 0);

function note(id: string, updatedAt = NOW): Note {
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
}

/** Unit vectors on a plane, so similarity is easy to reason about. */
function vector(angle: number): Float32Array {
  return Float32Array.from([Math.cos(angle), Math.sin(angle)]);
}

test("recency decays by half every two weeks", () => {
  expect(recencyScore(NOW, NOW)).toBe(1);
  expect(recencyScore(new Date(NOW.getTime() - 14 * 24 * 3600_000), NOW)).toBeCloseTo(0.5, 5);
  expect(recencyScore(new Date(NOW.getTime() - 28 * 24 * 3600_000), NOW)).toBeCloseTo(0.25, 5);
});

test("weights are the only thing deciding the blend", () => {
  const signals = { semantic: 1, lexical: 0, recency: 0 };
  expect(combine(signals, DEFAULT_WEIGHTS)).toBeCloseTo(0.6, 5);
  expect(combine(signals, { semantic: 0, lexical: 1, recency: 0 })).toBe(0);
});

test("lexical scores are normalized against the best hit", () => {
  expect(normalizeLexical([0.5, 0.25, 0])).toEqual([1, 0.5, 0]);
  expect(normalizeLexical([0, 0])).toEqual([0, 0]);
});

test("meaning outranks word overlap", () => {
  const query = vector(0);
  const results = rank(
    [
      { note: note("lexical-only"), lexical: 1 },
      { note: note("semantic-match"), embedding: vector(0) },
    ],
    { queryEmbedding: query, now: NOW },
  );

  expect(results[0]?.note.id).toBe("semantic-match");
});

test("a note without an embedding still competes", () => {
  const results = rank([{ note: note("unembedded"), lexical: 1 }], {
    queryEmbedding: vector(0),
    now: NOW,
  });

  expect(results).toHaveLength(1);
  expect(results[0]?.semantic).toBe(0);
});

test("older notes rank behind equally relevant new ones", () => {
  const old = new Date(NOW.getTime() - 60 * 24 * 3600_000);
  const results = rank(
    [
      { note: note("old", old), embedding: vector(0) },
      { note: note("fresh", NOW), embedding: vector(0) },
    ],
    { queryEmbedding: vector(0), now: NOW },
  );

  expect(results.map((result) => result.note.id)).toEqual(["fresh", "old"]);
});

test("related notes ignore recency and exclude the note itself", () => {
  const results = relatedTo(
    vector(0),
    [
      { note: note("self"), embedding: vector(0) },
      { note: note("close", new Date(2020, 0, 1)), embedding: vector(0.2) },
      { note: note("unrelated"), embedding: vector(Math.PI / 2) },
    ],
    { excludeNoteId: "self" },
  );

  expect(results.map((result) => result.note.id)).toEqual(["close"]);
  expect(results[0]?.semantic).toBeGreaterThan(0.9);
});

test("ties break deterministically", () => {
  const candidates = [
    { note: note("b"), embedding: vector(0) },
    { note: note("a"), embedding: vector(0) },
  ];
  const first = rank(candidates, { queryEmbedding: vector(0), now: NOW });
  const second = rank(candidates, { queryEmbedding: vector(0), now: NOW });
  expect(first.map((r) => r.note.id)).toEqual(second.map((r) => r.note.id));
  expect(first[0]?.note.id).toBe("a");
});
