import { expect, test } from "bun:test";
import { closeTab, moveTab, neighbourOf, openTab } from "./session";

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
