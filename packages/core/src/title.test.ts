import { expect, test } from "bun:test";
import { deriveTitle } from "./title";

test("skips blank lines and strips markdown marks", () => {
  expect(deriveTitle("\n\n## Deploy checklist\nbody")).toBe("Deploy checklist");
  expect(deriveTitle("- [ ] ship the parser")).toBe("ship the parser");
  expect(deriveTitle("> quoted thought")).toBe("quoted thought");
});

test("empty content has an empty title", () => {
  expect(deriveTitle("   \n\n")).toBe("");
});

test("long first lines are capped", () => {
  expect(deriveTitle("x".repeat(300))).toHaveLength(120);
});
