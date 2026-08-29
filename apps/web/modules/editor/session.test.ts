import { expect, test } from "bun:test";
import {
  closeTab,
  moveTab,
  neighbourOf,
  openTab,
  readActive,
  readClosed,
  readPlace,
  rememberClosed,
  takeClosed,
  writeActive,
  writePlace,
} from "./session";

test("opening appends, and opening twice lands on the tab that is there", () => {
  expect(openTab(["a"], "b")).toEqual(["a", "b"]);
  expect(openTab(["a", "b"], "a")).toEqual(["a", "b"]);
});

test("a tab dropped on another takes its place", () => {
  // Rightwards: past the tab it was dropped on, so the last one is reachable.
  expect(moveTab(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
  expect(moveTab(["a", "b", "c"], "a", "b")).toEqual(["b", "a", "c"]);
  // Leftwards: in front of it.
  expect(moveTab(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
  // Nowhere to go.
  expect(moveTab(["a", "b"], "b", "b")).toEqual(["a", "b"]);
  expect(moveTab(["a", "b"], "a", "gone")).toEqual(["a", "b"]);
});

test("closing hands focus to the right, then to the left, then to nothing", () => {
  expect(neighbourOf(["a", "b", "c"], "b")).toBe("c");
  expect(neighbourOf(["a", "b"], "b")).toBe("a");
  expect(neighbourOf(["a"], "a")).toBeNull();
  expect(closeTab(["a", "b"], "a")).toEqual(["b"]);
});

// The parts of this module that touch storage — the closed stack, the active tab, and where the
// caret was in each note — run against the smallest possible stand-in for it: the real thing is a
// browser's, not bun's.
const stored = new Map<string, string>();
// biome-ignore lint/suspicious/noExplicitAny: a two-method double is not a Window
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  },
};

test("Ctrl Shift T reopens the most recently closed tab, once", () => {
  stored.clear();
  rememberClosed("a");
  rememberClosed("b");

  expect(takeClosed()).toBe("b");
  expect(takeClosed()).toBe("a");
  expect(takeClosed()).toBeNull();
});

test("closing the same tab twice leaves one entry, not two", () => {
  stored.clear();
  rememberClosed("a");
  rememberClosed("b");
  rememberClosed("a");

  expect(readClosed()).toEqual(["b", "a"]);
});

test("the stack forgets past ten", () => {
  stored.clear();
  for (let at = 0; at < 14; at += 1) rememberClosed(`note-${at}`);

  expect(readClosed()).toHaveLength(10);
  expect(readClosed()[0]).toBe("note-4");
  expect(takeClosed()).toBe("note-13");
});

test("where you were is remembered apart from the order the tabs are in", () => {
  stored.clear();
  expect(readActive()).toBeNull();

  writeActive("b");
  // Dragging reorders the session; it must not move where the window reopens.
  expect(moveTab(["a", "b", "c"], "b", "c")).toEqual(["a", "c", "b"]);
  expect(readActive()).toBe("b");
});

test("where you were inside a note is the line and the scroll, not just the note", () => {
  expect(readPlace("never-opened")).toBeNull();

  writePlace("a", { caret: 412, scroll: 300 });
  expect(readPlace("a")).toEqual({ caret: 412, scroll: 300 });

  // The last place wins: this is where the caret is, not a history of where it has been.
  writePlace("a", { caret: 9, scroll: 0 });
  expect(readPlace("a")).toEqual({ caret: 9, scroll: 0 });
});

test("only the last hundred notes keep a place, and being written in is what keeps one", () => {
  for (let at = 0; at < 120; at += 1) writePlace(`note-${at}`, { caret: at, scroll: 0 });

  // The twenty oldest were dropped to make room.
  expect(readPlace("note-0")).toBeNull();
  expect(readPlace("note-19")).toBeNull();
  expect(readPlace("note-20")).toEqual({ caret: 20, scroll: 0 });

  // Being written in again moves a note to the back of the queue rather than leaving it where the
  // trim will reach it next.
  writePlace("note-20", { caret: 1, scroll: 0 });
  for (let at = 120; at < 140; at += 1) writePlace(`note-${at}`, { caret: at, scroll: 0 });
  expect(readPlace("note-20")).toEqual({ caret: 1, scroll: 0 });
  expect(readPlace("note-39")).toBeNull();
});
