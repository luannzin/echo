import { expect, test } from "bun:test";
import type { Note, Task } from "@echo/types";
import { buildBrief } from "./brief";

const WORKSPACE = "00000000-0000-0000-0000-000000000001";

const note = (id: string, day: number, content = id): Note => ({
  id,
  workspaceId: WORKSPACE,
  folderId: null,
  title: id,
  content,
  archivedAt: null,
  createdAt: new Date(2026, 7, day),
  updatedAt: new Date(2026, 7, day),
});

const task = (id: string, noteId: string, dueAt: Date | null, done = false): Task => ({
  id,
  workspaceId: WORKSPACE,
  noteId,
  title: id,
  dueAt,
  completedAt: done ? new Date(2026, 7, 20) : null,
  createdAt: new Date(2026, 7, 10),
  updatedAt: new Date(2026, 7, 10),
});

test("a project with nothing in it has no brief, rather than an empty one", () => {
  expect(buildBrief([], [])).toBeNull();
});

test("the brief counts the project and names its span", () => {
  const brief = buildBrief([note("a", 3), note("b", 17), note("c", 22)], []);
  expect(brief?.count).toBe(3);
  expect(brief?.from).toEqual(new Date(2026, 7, 3));
  expect(brief?.to).toEqual(new Date(2026, 7, 22));
  // Newest first: what you were last doing here.
  expect(brief?.recent.map((held) => held.id)).toEqual(["c", "b", "a"]);
});

test("what is still open is soonest first, and undated is still open", () => {
  const notes = [note("a", 3)];
  const brief = buildBrief(notes, [
    task("later", "a", new Date(2026, 8, 20)),
    task("undated", "a", null),
    task("soon", "a", new Date(2026, 8, 1)),
    task("finished", "a", new Date(2026, 8, 2), true),
  ]);

  expect(brief?.open.map((held) => held.id)).toEqual(["soon", "later", "undated"]);
});

test("a task belonging to another project is not this project's open item", () => {
  const brief = buildBrief([note("a", 3)], [task("elsewhere", "somewhere-else", null)]);
  expect(brief?.open).toEqual([]);
});

test("the reader's own labels lead, and what echo read fills what is left", () => {
  const brief = buildBrief([note("a", 3), note("b", 4)], [], {
    categoriesOf: (id) => (id === "a" ? ["Gameplay"] : ["Gameplay", "Audio"]),
    themesOf: () => ["extraction", "gameplay", "zumbis"],
    themes: 4,
  });

  // Stated first, most-used first, and echo does not repeat a word the reader already chose.
  expect(brief?.themes).toEqual(["Gameplay", "Audio", "extraction", "zumbis"]);
});

test("an unlabelled project is described in the words it used", () => {
  const brief = buildBrief([note("a", 3)], [], { themesOf: () => ["merchant", "extraction"] });
  expect(brief?.themes).toEqual(["merchant", "extraction"]);
});

test("the same project always briefs the same way", () => {
  const notes = [note("a", 3), note("b", 17)];
  expect(buildBrief(notes, [])).toEqual(buildBrief(notes, []));
});
