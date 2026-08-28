import { expect, test } from "bun:test";
import type { Folder, Note } from "@echo/types";
import { movedBy, planFiling, reasonsFor } from "./plan";

const note = (id: string): Note => ({
  id,
  workspaceId: "00000000-0000-0000-0000-000000000001",
  folderId: null,
  title: id,
  content: id,
  archivedAt: null,
  createdAt: new Date(2026, 7, 26),
  updatedAt: new Date(2026, 7, 26),
});

const folder = (id: string, name: string): Folder => ({
  id,
  workspaceId: "00000000-0000-0000-0000-000000000001",
  parentId: null,
  name,
  createdAt: new Date(2026, 7, 26),
  updatedAt: new Date(2026, 7, 26),
});

test("the plan groups by destination, biggest first, with the leftovers last", () => {
  const folders = [folder("work", "Work"), folder("games", "Games")];
  const bound = new Map<string, string>([
    ["a", "work"],
    ["b", "work"],
    ["c", "games"],
  ]);

  const plan = planFiling(
    ["a", "b", "c", "d"].map(note),
    folders,
    (noteId) => bound.get(noteId) ?? null,
  );

  expect(plan.map((group) => [group.label, group.notes.length])).toEqual([
    ["Work", 2],
    ["Games", 1],
    ["Staying in the Inbox", 1],
  ]);
});

test("what stays put is not counted as moved", () => {
  const plan = planFiling([note("a"), note("b")], [folder("work", "Work")], (noteId) =>
    noteId === "a" ? "work" : null,
  );
  expect(movedBy(plan)).toBe(1);
});

test("moving one note in the plan leaves the rest where they were", () => {
  const bound = new Map<string, string | null>([
    ["a", "work"],
    ["b", "work"],
    ["c", "games"],
  ]);
  bound.set("c", null);

  const plan = planFiling(
    ["a", "b", "c"].map(note),
    [folder("work", "Work"), folder("games", "Games")],
    (noteId) => bound.get(noteId) ?? null,
  );

  expect(plan.map((group) => [group.label, group.notes.length])).toEqual([
    ["Work", 2],
    ["Staying in the Inbox", 1],
  ]);
});

test("the reason is the reader's own habit, in their own words", () => {
  const concepts = new Map([
    ["new", ["React", "TypeScript"]],
    ["old", ["React", "TypeScript", "Testing"]],
    ["older", ["React"]],
  ]);

  const reasons = reasonsFor({
    note: note("new"),
    destination: { folderId: "work", confidence: 0.8, because: ["old"] },
    notesIn: [note("old"), note("older")],
    conceptsOf: (noteId) => concepts.get(noteId) ?? [],
    titleOf: (noteId) => (noteId === "old" ? "The old note" : undefined),
  });

  expect(reasons[0]).toEqual({ kind: "habit", concepts: ["React", "TypeScript"] });
  // And the note that argued for it, by name — a reason you can open is one you can disagree with.
  expect(reasons[1]).toEqual({ kind: "neighbour", title: "The old note" });
});

test("a folder sharing nothing with the note offers no habit", () => {
  const reasons = reasonsFor({
    note: note("new"),
    destination: { folderId: "work", confidence: 0.8, because: [] },
    notesIn: [note("old")],
    conceptsOf: (noteId) => (noteId === "new" ? ["React"] : ["Cooking"]),
    titleOf: () => undefined,
  });
  expect(reasons).toEqual([]);
});
