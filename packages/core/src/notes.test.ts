import { expect, test } from "bun:test";
import type { Note } from "@echo/types";
import { createEcho } from "./index";
import type { NoteRepository, Repositories } from "./ports";

/** In-memory stand-in: services are tested without a database, repositories are tested with one. */
function memoryRepositories(): Repositories {
  const rows = new Map<string, Note>();
  const notes: NoteRepository = {
    async insert(note) {
      rows.set(note.id, note);
      return note;
    },
    async update(id, patch) {
      const current = rows.get(id);
      if (!current) throw new Error(`Note ${id} not found`);
      const next = { ...current, ...patch };
      rows.set(id, next);
      return next;
    },
    async delete(id) {
      rows.delete(id);
    },
    async get(id) {
      return rows.get(id) ?? null;
    },
    async list() {
      return [...rows.values()];
    },
  };
  return {
    notes,
    folders: {
      insert: async (folder) => folder,
      update: async () => {
        throw new Error("unused");
      },
      delete: async () => {},
      get: async () => null,
      list: async () => [],
    },
  };
}

function testEcho() {
  const events: string[] = [];
  const echo = createEcho({ repositories: memoryRepositories() });
  echo.events.subscribe((event) => events.push(event.type));
  return { echo, events };
}

test("a new note derives its title from the first meaningful line", async () => {
  const { echo, events } = testEcho();
  const note = await echo.notes.create({ content: "# Cache invalidation\n\nnotes follow" });

  expect(note.title).toBe("Cache invalidation");
  expect(note.folderId).toBeNull();
  expect(events).toEqual(["note.created"]);
});

test("saving identical content writes nothing and emits nothing", async () => {
  const { echo, events } = testEcho();
  const note = await echo.notes.create({ content: "unchanged" });
  const again = await echo.notes.saveContent(note.id, "unchanged");

  expect(again.updatedAt).toEqual(note.updatedAt);
  expect(events).toEqual(["note.created"]);
});

test("saving new content refreshes the title and emits an update", async () => {
  const { echo, events } = testEcho();
  const note = await echo.notes.create({ content: "first" });
  const saved = await echo.notes.saveContent(note.id, "second\nthird");

  expect(saved.title).toBe("second");
  expect(saved.content).toBe("second\nthird");
  expect(events).toEqual(["note.created", "note.updated"]);
});

test("moving a note emits both update and move, with the previous location", async () => {
  const { echo, events } = testEcho();
  const note = await echo.notes.create({ content: "movable" });
  const folderId = crypto.randomUUID();

  const moved = await echo.notes.move(note.id, folderId);

  expect(moved.folderId).toBe(folderId);
  expect(events).toEqual(["note.created", "note.updated", "note.moved"]);
});
