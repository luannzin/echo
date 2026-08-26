import { expect, test } from "bun:test";
import { detectMentions } from "@echo/parser";
import type { Note } from "@echo/types";
import { whatChanged } from "./changes";
import { createObservationService } from "./observations";
import type { ObservationRepository } from "./ports";
import { buildAnchors, currentWeek, overlaps, resolveMentions } from "./temporal";
import { buildTimeline } from "./timeline";

const NOW = new Date("2026-08-26T15:00:00");

const note = (id: string, createdAt: string, title = id): Note => ({
  id,
  workspaceId: "00000000-0000-0000-0000-000000000001",
  folderId: null,
  title,
  content: title,
  archivedAt: null,
  createdAt: new Date(createdAt),
  updatedAt: new Date(createdAt),
});

// ── anchors ───────────────────────────────────────────────────────────────────────────────────

test("a span named against a project starts when the project did", () => {
  const anchors = buildAnchors([
    { name: "HEREZE", at: new Date("2026-05-02T09:00:00") },
    { name: "HEREZE", at: new Date("2026-06-11T09:00:00") },
  ]);
  const [resolved] = resolveMentions(detectMentions("depois que comecei HEREZE", NOW), anchors);
  // Earliest wins: a project began when its first note was written.
  expect(resolved?.start).toEqual(new Date("2026-05-02T09:00:00"));
  expect(resolved?.end).toEqual(NOW);
});

test("the longest name the reader actually used is the one taken", () => {
  const anchors = buildAnchors([{ name: "HEREZE", at: new Date("2026-05-02T09:00:00") }]);
  const [resolved] = resolveMentions(
    detectMentions("depois que comecei HEREZE tudo mudou", NOW),
    anchors,
  );
  expect(resolved?.start).toEqual(new Date("2026-05-02T09:00:00"));
});

test("an anchor the corpus has never heard of is dropped, not guessed", () => {
  expect(resolveMentions(detectMentions("desde o projeto Vênus", NOW), buildAnchors([]))).toEqual(
    [],
  );
});

test("an open edge overlaps anything on that side", () => {
  const anchors = buildAnchors([{ name: "HEREZE", at: new Date("2026-05-02T09:00:00") }]);
  const [before] = resolveMentions(detectMentions("antes do projeto HEREZE", NOW), anchors);
  if (!before) throw new Error("nothing resolved");
  expect(overlaps(before, { from: new Date("2020-01-01"), to: new Date("2020-02-01") })).toBe(true);
  expect(overlaps(before, { from: new Date("2026-07-01"), to: new Date("2026-08-01") })).toBe(
    false,
  );
});

test("the current week runs Monday to Sunday", () => {
  const week = currentWeek(NOW);
  expect(week.from.toISOString().slice(0, 10)).toBe("2026-08-24");
  expect(week.to.toISOString().slice(0, 10)).toBe("2026-08-30");
});

// ── timeline ──────────────────────────────────────────────────────────────────────────────────

test("the timeline groups by the day a thought was had, newest first", () => {
  const days = buildTimeline([
    note("a", "2026-08-26T09:00:00"),
    note("b", "2026-08-26T18:00:00"),
    note("c", "2026-08-24T10:00:00"),
  ]);
  expect(days).toHaveLength(2);
  expect(days[0]?.noteIds).toEqual(["b", "a"]);
  expect(days[1]?.noteIds).toEqual(["c"]);
});

test("a day is labelled with the reader's own categories", () => {
  const [day] = buildTimeline(
    [note("a", "2026-08-26T09:00:00"), note("b", "2026-08-26T10:00:00")],
    {
      conceptsOf: (id) => (id === "a" ? ["auth", "backend"] : ["auth"]),
    },
  );
  // The label two notes share leads the row.
  expect(day?.concepts[0]).toBe("auth");
});

test("an unlabelled day falls back to the words it used", () => {
  const [day] = buildTimeline([note("a", "2026-08-26T09:00:00", "middleware caching middleware")]);
  expect(day?.concepts).toContain("middleware");
});

test("the same notes always build the same timeline", () => {
  const notes = [note("a", "2026-08-26T09:00:00"), note("b", "2026-08-24T09:00:00")];
  expect(buildTimeline(notes)).toEqual(buildTimeline(notes));
});

// ── what changed ──────────────────────────────────────────────────────────────────────────────

test("nothing new is null rather than an empty shape", () => {
  expect(whatChanged([note("a", "2026-08-01T09:00:00")], new Date("2026-08-20"))).toBeNull();
  expect(whatChanged([note("a", "2026-08-01T09:00:00")], null)).toBeNull();
});

test("what changed names only what arrived, and only the concepts that are new", () => {
  const change = whatChanged(
    [note("old", "2026-08-01T09:00:00"), note("new", "2026-08-25T09:00:00")],
    new Date("2026-08-20"),
    { conceptsOf: (id) => (id === "new" ? ["merchant", "extraction"] : ["extraction"]) },
  );
  expect(change?.notes.map((held) => held.id)).toEqual(["new"]);
  // "Extraction" was already there before the reader left; only "merchant" is news.
  expect(change?.concepts).toEqual(["merchant"]);
});

// ── observations ──────────────────────────────────────────────────────────────────────────────

const memoryObservations = (): ObservationRepository & { rows: number } => {
  const state = {
    rows: 0,
    async record() {
      state.rows += 1;
    },
    async lastSeen() {
      return new Map<string, Date>();
    },
  };
  return state;
};

test("a visit returns the one before it, so a baseline is never moved by its own read", async () => {
  const repository = memoryObservations();
  let clock = new Date("2026-08-01T09:00:00");
  const observations = createObservationService({
    repository,
    now: () => clock,
    newId: () => crypto.randomUUID(),
  });

  expect(await observations.seen("project_seen", "hereze")).toBeNull();
  clock = new Date("2026-08-20T09:00:00");
  expect(await observations.seen("project_seen", "hereze")).toEqual(
    new Date("2026-08-01T09:00:00"),
  );
});

test("clicking back into a project a minute later is the same visit", async () => {
  const repository = memoryObservations();
  let clock = new Date("2026-08-01T09:00:00");
  const observations = createObservationService({
    repository,
    now: () => clock,
    newId: () => crypto.randomUUID(),
  });

  await observations.seen("project_seen", "hereze");
  clock = new Date("2026-08-01T09:01:00");
  await observations.seen("project_seen", "hereze");
  expect(repository.rows).toBe(1);
});
