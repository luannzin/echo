import { expect, test } from "bun:test";
import { type Neighbour, suggestDestinations } from "./destinations";

function neighbour(noteId: string, folderId: string | null, similarity: number): Neighbour {
  return { noteId, folderId, similarity };
}

test("the folder most of the close notes are in wins", () => {
  const [top] = suggestDestinations([
    neighbour("a", "work", 0.9),
    neighbour("b", "work", 0.8),
    neighbour("c", "personal", 0.6),
  ]);

  expect(top?.folderId).toBe("work");
  expect(top?.because).toEqual(["a", "b"]);
});

test("closeness counts, not headcount", () => {
  const [top] = suggestDestinations([
    neighbour("a", "auth", 0.95),
    neighbour("b", "misc", 0.4),
    neighbour("c", "misc", 0.4),
  ]);

  expect(top?.folderId).toBe("auth");
});

test("unfiled neighbours abstain rather than voting for the Inbox", () => {
  const suggestions = suggestDestinations([
    neighbour("a", null, 0.99),
    neighbour("b", null, 0.98),
    neighbour("c", "work", 0.6),
  ]);

  expect(suggestions.map((destination) => destination.folderId)).toEqual(["work"]);
});

test("a folder nobody near the note is in is not suggested", () => {
  expect(suggestDestinations([neighbour("a", null, 0.9)])).toEqual([]);
  expect(suggestDestinations([])).toEqual([]);
});

test("an even split between three folders suggests none of them", () => {
  const suggestions = suggestDestinations([
    neighbour("a", "one", 0.6),
    neighbour("b", "two", 0.6),
    neighbour("c", "three", 0.6),
  ]);

  expect(suggestions).toEqual([]);
});

test("corrections quiet a folder without promoting the runner-up", () => {
  const neighbours = [neighbour("a", "work", 0.9), neighbour("b", "personal", 0.8)];

  const before = suggestDestinations(neighbours);
  const after = suggestDestinations(neighbours, {
    weightOf: (folderId) => (folderId === "work" ? 0.2 : 1),
  });

  expect(before[0]?.folderId).toBe("work");
  expect(after[0]?.folderId).toBe("personal");
  // Damping "work" must not change what "personal" earned on the evidence.
  expect(after.find((destination) => destination.folderId === "personal")?.confidence).toBeCloseTo(
    before.find((destination) => destination.folderId === "personal")?.confidence ?? 0,
    10,
  );
});

test("the same neighbours always produce the same answer", () => {
  const neighbours = [
    neighbour("b", "work", 0.7),
    neighbour("a", "work", 0.7),
    neighbour("c", "games", 0.7),
  ];

  expect(suggestDestinations(neighbours)).toEqual(suggestDestinations([...neighbours].reverse()));
});
