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
