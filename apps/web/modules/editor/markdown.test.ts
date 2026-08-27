import { describe, expect, test } from "bun:test";
import { activeBlock, blocksOf, lineAtOffset } from "./markdown";

describe("lineAtOffset", () => {
  test("counts the newlines behind the caret", () => {
    const text = "one\ntwo\nthree";
    expect(lineAtOffset(text, 0)).toBe(0);
    expect(lineAtOffset(text, 3)).toBe(0);
    expect(lineAtOffset(text, 4)).toBe(1);
    expect(lineAtOffset(text, text.length)).toBe(2);
  });

  test("survives an offset outside the text", () => {
    expect(lineAtOffset("a\nb", -5)).toBe(0);
    expect(lineAtOffset("a\nb", 999)).toBe(1);
  });
});

describe("blocksOf", () => {
  test("gives every block the line it starts on, counting the blank ones", () => {
    const blocks = blocksOf("# Title\n\nA paragraph.\n\n- one\n- two\n");
    expect(blocks.map((block) => [block.token.type, block.line])).toEqual([
      ["heading", 0],
      ["paragraph", 2],
      ["list", 4],
    ]);
  });

  test("drops blank stretches from the output after counting them", () => {
    const blocks = blocksOf("first\n\n\n\nsecond");
    expect(blocks).toHaveLength(2);
    expect(blocks[1]?.line).toBe(4);
  });

  test("a fence is one block, however many lines it holds", () => {
    const blocks = blocksOf("intro\n\n```ts\nconst a = 1;\nconst b = 2;\n```\n\nafter");
    expect(blocks.map((block) => block.token.type)).toEqual(["paragraph", "code", "paragraph"]);
    expect(blocks[2]?.line).toBe(7);
  });
});

describe("activeBlock", () => {
  const blocks = blocksOf("# Title\n\nA paragraph.\n\n```\ncode\n```\n");

  test("is the last block starting at or above the caret", () => {
    expect(activeBlock(blocks, 0)).toBe(0);
    expect(activeBlock(blocks, 1)).toBe(0);
    expect(activeBlock(blocks, 2)).toBe(1);
    expect(activeBlock(blocks, 5)).toBe(2);
    expect(activeBlock(blocks, 400)).toBe(2);
  });

  test("is nothing when there are no blocks", () => {
    expect(activeBlock([], 0)).toBe(-1);
  });
});
