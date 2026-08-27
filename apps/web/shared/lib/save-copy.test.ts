import { expect, test } from "bun:test";
import { filenameFor } from "./save-copy";

test("a note's title becomes a filename a filesystem will take", () => {
  expect(filenameFor("Deploy checklist")).toBe("Deploy checklist.md");
  expect(filenameFor("notes: prod/staging")).toBe("notes- prod-staging.md");
  expect(filenameFor("  spaced   out  ")).toBe("spaced out.md");
});

test("a note with no title still gets a name", () => {
  expect(filenameFor("")).toBe("note.md");
  expect(filenameFor("   ")).toBe("note.md");
  // Punctuation is replaced rather than dropped, so two notes cannot collapse onto one name.
  expect(filenameFor("///")).toBe("---.md");
});

test("a long title is cut, not carried", () => {
  expect(filenameFor("x".repeat(200))).toHaveLength(63);
});
