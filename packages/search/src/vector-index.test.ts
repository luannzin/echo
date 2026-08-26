import { expect, test } from "bun:test";
import { normalize } from "@echo/embeddings";
import { createVectorIndex } from "./vector-index";

/** A unit vector pointing mostly along one axis, so "closest" is predictable. */
const direction = (axis: number, dimensions = 8): Float32Array => {
  const values = new Float32Array(dimensions);
  values[axis] = 1;
  return normalize(values);
};

test("finds the nearest vectors, best first", () => {
  const index = createVectorIndex(8);
  index.load([
    { noteId: "x", values: direction(0) },
    { noteId: "y", values: direction(1) },
    { noteId: "z", values: normalize(Float32Array.from([0.9, 0.4, 0, 0, 0, 0, 0, 0])) },
  ]);

  const matches = index.nearest(direction(0), { limit: 2 });
  expect(matches.map((match) => match.noteId)).toEqual(["x", "z"]);
  expect(matches[0]?.similarity).toBeCloseTo(1, 5);
});

test("a bounded answer matches an exhaustive one", () => {
  const index = createVectorIndex(8);
  const entries = Array.from({ length: 200 }, (_, seed) => {
    const values = new Float32Array(8);
    for (let d = 0; d < 8; d++) values[d] = Math.sin(seed * 7.3 + d * 1.7);
    return { noteId: `n${seed}`, values: normalize(values) };
  });
  index.load(entries);

  const query = normalize(Float32Array.from([1, 0.5, -0.2, 0, 0.3, 0, 0, 0.1]));
  const exhaustive = index
    .nearest(query, { limit: entries.length })
    .slice(0, 5)
    .map((match) => match.noteId);

  expect(index.nearest(query, { limit: 5 }).map((match) => match.noteId)).toEqual(exhaustive);
});

test("a note excluded from the search is never its own match", () => {
  const index = createVectorIndex(8);
  index.load([
    { noteId: "self", values: direction(0) },
    { noteId: "other", values: direction(0) },
  ]);

  const matches = index.nearest(direction(0), { limit: 5, excludeNoteId: "self" });
  expect(matches.map((match) => match.noteId)).toEqual(["other"]);
});

test("weak matches are not answers", () => {
  const index = createVectorIndex(8);
  index.load([{ noteId: "far", values: direction(3) }]);
  expect(index.nearest(direction(0), { minimumSimilarity: 0.5 })).toEqual([]);
});

test("a vector can be replaced, and the old one stops matching", () => {
  const index = createVectorIndex(8);
  index.load([{ noteId: "a", values: direction(0) }]);
  index.put("a", direction(4));

  expect(index.size).toBe(1);
  expect(index.nearest(direction(0), { minimumSimilarity: 0.5 })).toEqual([]);
  expect(index.nearest(direction(4))[0]?.noteId).toBe("a");
});

test("removing a note keeps every other note findable", () => {
  const index = createVectorIndex(8);
  index.load([
    { noteId: "a", values: direction(0) },
    { noteId: "b", values: direction(1) },
    { noteId: "c", values: direction(2) },
  ]);

  index.remove("a");

  expect(index.size).toBe(2);
  expect(index.has("a")).toBe(false);
  expect(index.nearest(direction(1))[0]?.noteId).toBe("b");
  expect(index.nearest(direction(2))[0]?.noteId).toBe("c");
  expect(index.nearest(direction(0), { minimumSimilarity: 0.5 })).toEqual([]);
});

test("growing from empty keeps every vector intact", () => {
  const index = createVectorIndex(8);
  for (let axis = 0; axis < 8; axis++) index.put(`n${axis}`, direction(axis));

  expect(index.size).toBe(8);
  for (let axis = 0; axis < 8; axis++) {
    expect(index.nearest(direction(axis), { limit: 1 })[0]?.noteId).toBe(`n${axis}`);
  }
});

test("a vector of the wrong width is rejected rather than silently compared", () => {
  const index = createVectorIndex(8);
  expect(() => index.put("a", new Float32Array(4))).toThrow(/8 dimensions/);
  index.put("a", direction(0));
  expect(() => index.nearest(new Float32Array(4))).toThrow(/8 dimensions/);
});
