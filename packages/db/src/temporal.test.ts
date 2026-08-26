import { expect, test } from "bun:test";
import { createEcho } from "@echo/core";
import { detectMentions } from "@echo/parser";
import { openRepositories } from "./index";

const open = async () => {
  const { repositories } = await openRepositories();
  return { repositories, echo: createEcho({ repositories }) };
};

test("a note with no dates keeps its row, so it is never re-read forever", async () => {
  const { repositories, echo } = await open();
  const note = await echo.notes.create({ content: "no dates in here at all" });

  expect(await repositories.temporal.pending()).toEqual([note.id]);
  await repositories.temporal.put(note.id, [], new Date());
  expect(await repositories.temporal.pending()).toEqual([]);
});

test("editing a note puts it back in the queue", async () => {
  const { repositories, echo } = await open();
  const note = await echo.notes.create({ content: "first" });
  await repositories.temporal.put(note.id, [], new Date(Date.now() - 1000));

  await echo.notes.saveContent(note.id, "second");

  expect(await repositories.temporal.pending()).toEqual([note.id]);
});

test("mentions survive a round trip as dates, not strings", async () => {
  const { repositories, echo } = await open();
  const now = new Date("2026-08-26T15:00:00");
  const note = await echo.notes.create({ content: "entrego até sexta" });

  await repositories.temporal.put(note.id, detectMentions(note.content, now), now);
  const [mention] = await repositories.temporal.get(note.id);

  expect(mention?.kind).toBe("deadline");
  expect(mention?.start).toBeInstanceOf(Date);
  expect(mention?.end).toBeInstanceOf(Date);
});

test("a window finds the notes pointing into it, and only those", async () => {
  const { repositories, echo } = await open();
  const now = new Date("2026-08-26T15:00:00");
  const soon = await echo.notes.create({ content: "falar com o João semana que vem" });
  const past = await echo.notes.create({ content: "semana passada mexi no auth" });
  for (const note of [soon, past]) {
    await repositories.temporal.put(note.id, detectMentions(note.content, now), now);
  }

  const week = await repositories.temporal.inWindow(
    new Date("2026-08-31T00:00:00"),
    new Date("2026-09-06T23:59:59"),
  );

  expect(week.map((held) => held.noteId)).toEqual([soon.id]);
});

test("a span waiting on an anchor never matches a window", async () => {
  const { repositories, echo } = await open();
  const now = new Date("2026-08-26T15:00:00");
  const note = await echo.notes.create({ content: "depois que comecei HEREZE" });

  await repositories.temporal.put(note.id, detectMentions(note.content, now), now);

  // Its start is unknown here, and an unknown edge must not read as "since the beginning of time".
  expect(
    await repositories.temporal.inWindow(new Date("2000-01-01"), new Date("2001-01-01")),
  ).toEqual([]);
});

test("visits are recorded and the newest one is what comes back", async () => {
  const { repositories } = await open();
  const at = new Date("2026-08-20T09:00:00");
  const later = new Date("2026-08-25T09:00:00");
  for (const stamp of [at, later]) {
    await repositories.observations.record({
      id: crypto.randomUUID(),
      workspaceId: "00000000-0000-0000-0000-000000000001",
      type: "project_seen",
      subject: "hereze",
      at: stamp,
    });
  }

  expect((await repositories.observations.lastSeen("project_seen")).get("hereze")).toEqual(later);
});
