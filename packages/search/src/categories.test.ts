import { describe, expect, test } from "bun:test";
import { suggestCategories } from "./categories";

const neighbour = (noteId: string, similarity: number, categoryIds: string[]) => ({
  noteId,
  similarity,
  categoryIds,
});

describe("suggestCategories", () => {
  test("suggests a label most of the neighbourhood carries", () => {
    const [guess] = suggestCategories([
      neighbour("a", 0.9, ["work"]),
      neighbour("b", 0.8, ["work"]),
      neighbour("c", 0.7, ["work"]),
    ]);

    expect(guess?.categoryId).toBe("work");
    expect(guess?.confidence).toBeCloseTo(1);
    expect(guess?.because).toEqual(["a", "b", "c"]);
  });

  test("a note can be about more than one thing", () => {
    const guesses = suggestCategories([
      neighbour("a", 0.9, ["work", "urgent"]),
      neighbour("b", 0.8, ["work", "urgent"]),
    ]);

    expect(guesses.map((guess) => guess.categoryId).sort()).toEqual(["urgent", "work"]);
  });

  test("one neighbour's label is that neighbour's opinion", () => {
    expect(
      suggestCategories([
        neighbour("a", 0.9, ["work", "personal"]),
        neighbour("b", 0.9, ["work"]),
      ]).map((guess) => guess.categoryId),
    ).toEqual(["work"]);
  });

  test("a minority label is not what the note is about", () => {
    expect(
      suggestCategories([
        neighbour("a", 0.9, ["work"]),
        neighbour("b", 0.9, ["work"]),
        neighbour("c", 0.9, ["idea"]),
        neighbour("d", 0.9, ["idea"]),
        neighbour("e", 0.9, ["misc"]),
      ]).map((guess) => guess.categoryId),
    ).toEqual([]);
  });

  test("history may quiet a label but never invent one", () => {
    const neighbours = [neighbour("a", 0.9, ["work"]), neighbour("b", 0.8, ["work"])];
    expect(suggestCategories(neighbours, { weightOf: () => 0.2 })).toEqual([]);
    expect(suggestCategories([], { weightOf: () => 5 })).toEqual([]);
  });
});
