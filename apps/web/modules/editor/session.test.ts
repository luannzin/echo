import { expect, test } from "bun:test";
import {
  closeTab,
  moveTab,
  neighbourOf,
  openTab,
  readClosed,
  rememberClosed,
  takeClosed,
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

// The closed stack is the only part of this module that touches storage, so the smallest possible
// stand-in for it is what the tests run against — the real thing is a browser's, not bun's.
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
