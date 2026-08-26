import { expect, test } from "bun:test";
import { createEcho } from "@echo/core";
import { openRepositories } from "./index";
import { migrate } from "./migrate";

/** Every test gets a throwaway in-memory PGlite, migrated from the real migration files. */
async function testEcho() {
  const { repositories } = await openRepositories();
  return createEcho({ repositories });
}

test("notes survive a round trip through PGlite", async () => {
  const echo = await testEcho();
  const created = await echo.notes.create({ content: "Merchant system ideas" });

  const loaded = await echo.notes.get(created.id);

  expect(loaded?.title).toBe("Merchant system ideas");
  expect(loaded?.createdAt).toBeInstanceOf(Date);
  expect(loaded?.workspaceId).toBe("00000000-0000-0000-0000-000000000001");
});

test("listing is newest-first and hides archived notes unless asked", async () => {
  const echo = await testEcho();
  const first = await echo.notes.create({ content: "older" });
  const second = await echo.notes.create({ content: "newer" });
  await echo.notes.archive(first.id);

  const visible = await echo.notes.list();
  const all = await echo.notes.list({ includeArchived: true });

  expect(visible.map((note) => note.id)).toEqual([second.id]);
  expect(all).toHaveLength(2);
});

test("notes filter by folder, and null means Inbox", async () => {
  const echo = await testEcho();
  const folder = await echo.folders.create({ name: "Work" });
  const inFolder = await echo.notes.create({ content: "filed" });
  await echo.notes.create({ content: "loose" });
  await echo.notes.move(inFolder.id, folder.id);

  const filed = await echo.notes.list({ folderId: folder.id });
  const inbox = await echo.notes.list({ folderId: null });

  expect(filed.map((note) => note.content)).toEqual(["filed"]);
  expect(inbox.map((note) => note.content)).toEqual(["loose"]);
});

test("deleting a folder returns its notes to the Inbox instead of destroying them", async () => {
  const echo = await testEcho();
  const folder = await echo.folders.create({ name: "Temporary" });
  const note = await echo.notes.create({ content: "keep me", folderId: folder.id });

  await echo.folders.delete(folder.id);

  expect((await echo.notes.get(note.id))?.folderId).toBeNull();
});

test("a folder cannot be moved into its own subtree", async () => {
  const echo = await testEcho();
  const parent = await echo.folders.create({ name: "Games" });
  const child = await echo.folders.create({ name: "HEREZE", parentId: parent.id });

  expect(echo.folders.move(parent.id, child.id)).rejects.toThrow(/inside itself/);
});

test("migrations run once and are idempotent", async () => {
  const { db } = await openRepositories();

  expect(await migrate(db)).toEqual([]);
});

test("embeddings are stored, listed and re-queued when the note changes", async () => {
  const { repositories } = await openRepositories();
  const echo = createEcho({ repositories });
  const note = await echo.notes.create({ content: "vector round trip" });

  expect(await repositories.embeddings.pending("model-a")).toEqual([note.id]);

  await repositories.embeddings.put({
    noteId: note.id,
    model: "model-a",
    values: Float32Array.from([0.1, 0.2, 0.3]),
  });

  const stored = await repositories.embeddings.list("model-a");
  expect(stored).toHaveLength(1);
  expect([...(stored[0]?.values ?? [])]).toEqual([
    expect.closeTo(0.1, 5),
    expect.closeTo(0.2, 5),
    expect.closeTo(0.3, 5),
  ]);
  expect(await repositories.embeddings.pending("model-a")).toEqual([]);

  // a different model, and an edit, both put the note back in the queue
  expect(await repositories.embeddings.pending("model-b")).toEqual([note.id]);
  await echo.notes.saveContent(note.id, "vector round trip, edited");
  expect(await repositories.embeddings.pending("model-a")).toEqual([note.id]);
});

test("lexical search finds notes by their words and ranks them", async () => {
  const { repositories, lexical } = await openRepositories();
  const echo = createEcho({ repositories });
  await echo.notes.create({ content: "cache invalidation in the merchant system" });
  await echo.notes.create({ content: "unrelated thoughts about breakfast" });

  const hits = await lexical.search("cache");

  expect(hits).toHaveLength(1);
  expect(hits[0]?.rank).toBeGreaterThan(0);
  expect(await lexical.search("nothing matches this")).toEqual([]);
});

test("tasks are ordered by when they are due, with undated ones last", async () => {
  const echo = await testEcho();
  const note = await echo.notes.create({ content: "ship the landing page" });
  const someday = await echo.tasks.create({ noteId: note.id, title: "someday" });
  const later = await echo.tasks.create({
    noteId: note.id,
    title: "later",
    dueAt: new Date("2026-09-10T00:00:00Z"),
  });
  const sooner = await echo.tasks.create({
    noteId: note.id,
    title: "sooner",
    dueAt: new Date("2026-09-01T00:00:00Z"),
  });

  const listed = await echo.tasks.list();

  expect(listed.map((task) => task.id)).toEqual([sooner.id, later.id, someday.id]);
});

test("completing a task records when, and reopening clears it", async () => {
  const echo = await testEcho();
  const note = await echo.notes.create({ content: "call the bank" });
  const task = await echo.tasks.create({ noteId: note.id, title: "call the bank" });

  const done = await echo.tasks.setCompleted(task.id, true);
  const reopened = await echo.tasks.setCompleted(task.id, false);

  expect(done.completedAt).toBeInstanceOf(Date);
  expect(reopened.completedAt).toBeNull();
});

test("deleting a note takes its tasks with it", async () => {
  const echo = await testEcho();
  const note = await echo.notes.create({ content: "temporary" });
  await echo.tasks.create({ noteId: note.id, title: "temporary" });

  await echo.notes.delete(note.id);

  expect(await echo.tasks.list()).toHaveLength(0);
});
