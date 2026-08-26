import { expect, test } from "bun:test";
import type { Note } from "@echo/types";
import { createVectorIndex, rank, type SearchCandidate } from "./index";

/**
 * Retrieval at the size a real notebook reaches, with vectors standing in for the model. The model
 * is verified where it lives; what has to hold here is that a corpus this size does not drown the
 * one note the reader meant — including when that note shares not a single word with the question.
 *
 * Similarity comes from the real index rather than from arithmetic in the test, so this covers the
 * path the application actually takes: vectors in the index, scores out, ranking over the scores.
 */

/** A candidate plus the vector the index will hold for it. */
type Seeded = SearchCandidate & { embedding: Float32Array };

/** Scores a whole corpus against one question, exactly the way the application does. */
function scored(candidates: Seeded[], question: Float32Array): SearchCandidate[] {
  const index = createVectorIndex(DIMENSIONS);
  index.load(candidates.map((c) => ({ noteId: c.note.id, values: c.embedding })));
  return candidates.map(({ embedding: _embedding, ...candidate }) => ({
    ...candidate,
    semantic: index.scoreOf(question, candidate.note.id) ?? 0,
  }));
}

const NOW = new Date(2026, 7, 26, 12, 0, 0);
const DIMENSIONS = 8;

/** A deterministic generator, so a failure is always the same failure. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

function unit(values: number[]): Float32Array {
  const length = Math.hypot(...values) || 1;
  return Float32Array.from(values.map((value) => value / length));
}

function note(id: string, content: string, daysOld = 0): Note {
  const updatedAt = new Date(NOW.getTime() - daysOld * 24 * 3600_000);
  return {
    id,
    workspaceId: "00000000-0000-0000-0000-000000000001",
    folderId: null,
    title: content.slice(0, 40),
    content,
    archivedAt: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

/** 200 notes of noise, none of them about the question, spread over half a year. */
function corpus(): Seeded[] {
  const random = seeded(7);
  return Array.from({ length: 200 }, (_, index) => ({
    note: note(`noise-${String(index).padStart(3, "0")}`, `unrelated note number ${index}`, index),
    embedding: unit(Array.from({ length: DIMENSIONS }, () => random() - 0.5)),
    lexical: 0,
  }));
}

/** The question, as a vector. Everything below is measured against this direction. */
const query = unit([1, 0.2, 0, 0, 0, 0, 0, 0]);

test("the note the reader meant survives a corpus that does not mention it", () => {
  const candidates = corpus();

  // Written months ago, and not one word of the query appears in it.
  candidates.push({
    note: note("meant", "the CDN kept serving stale pages after every deploy", 120),
    embedding: unit([1, 0.25, 0.05, 0, 0, 0, 0, 0]),
    lexical: 0,
  });

  // Written today, and it does contain the words — but it is about something else entirely.
  candidates.push({
    note: note("word-match", "production cache is a great name for a band", 0),
    embedding: unit([0, 0, 1, 0, 0, 0, 0, 0]),
    lexical: 1,
  });

  const order = rank(scored(candidates, query), {
    now: NOW,
    limit: candidates.length,
  }).map((result) => result.note.id);

  expect(order[0]).toBe("meant");
  // The word match is not thrown away for missing the meaning — it just does not win.
  expect(order).toContain("word-match");
  expect(order.indexOf("word-match")).toBeGreaterThan(0);
});

test("a corpus of noise produces no confident match at all", () => {
  const results = rank(scored(corpus(), query), {
    now: NOW,
    minimumScore: 0.5,
  });

  // Silence is the right answer when nothing is about the question. Anything else teaches the
  // reader to distrust the list.
  expect(results).toHaveLength(0);
});

test("ranking a corpus twice ranks it the same way", () => {
  const candidates = corpus();
  const once = rank(scored(candidates, query), { now: NOW, limit: 20 });
  const twice = rank(scored(candidates, query), { now: NOW, limit: 20 });
  expect(once.map((result) => result.note.id)).toEqual(twice.map((result) => result.note.id));
});

test("the index answers a whole corpus without being asked about every note", () => {
  const candidates = corpus();
  const index = createVectorIndex(DIMENSIONS);
  index.load(candidates.map((c) => ({ noteId: c.note.id, values: c.embedding })));

  // What retrieval actually does: nominate a handful, rather than score two hundred into a sort.
  const nominated = index.nearest(query, { limit: 5 });
  const exhaustive = index.nearest(query, { limit: candidates.length }).slice(0, 5);

  expect(nominated.map((match) => match.noteId)).toEqual(exhaustive.map((match) => match.noteId));
});
