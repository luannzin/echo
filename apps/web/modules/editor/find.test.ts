import { expect, test } from "bun:test";
import { matchesOf } from "./find";

test("finds every occurrence, whatever case it was written in", () => {
  expect(matchesOf("Café com café", "café")).toEqual([0, 9]);
  expect(matchesOf("aaa", "b")).toEqual([]);
  expect(matchesOf("anything", "")).toEqual([]);
});

test("matches do not overlap, so Enter runs out where an editor's does", () => {
  expect(matchesOf("aaa", "aa")).toEqual([0]);
  expect(matchesOf("aaaa", "aa")).toEqual([0, 2]);
});

test("the needle is text, not a pattern", () => {
  expect(matchesOf("a (b) c", "(b)")).toEqual([2]);
  expect(matchesOf("a.b", ".")).toEqual([1]);
});
