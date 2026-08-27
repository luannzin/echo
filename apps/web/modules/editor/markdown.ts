import { marked, type Token } from "marked";

/**
 * A top-level piece of the note, and the line of the note it started on. The line is the whole
 * point: it is what lets the preview know which of its blocks is the one being written in, without
 * either side knowing anything about the other's layout.
 */
export type Block = { line: number; token: Token };

const newlines = (text: string): number => {
  let count = 0;
  for (const character of text) if (character === "\n") count += 1;
  return count;
};

/** Which line of `text` a character offset falls on, counting from zero. */
export const lineAtOffset = (text: string, offset: number): number =>
  newlines(text.slice(0, Math.max(0, Math.min(offset, text.length))));

/**
 * The note's blocks, each carrying the line it began on. Lines are accumulated from every token's
 * `raw` including the blank ones — a `space` token is dropped from the result but counted first,
 * because a blank line still moves everything under it down the note.
 */
export const blocksOf = (markdown: string): Block[] => {
  const blocks: Block[] = [];
  let line = 0;
  for (const token of marked.lexer(markdown)) {
    blocks.push({ line, token });
    line += newlines(token.raw);
  }
  return blocks.filter((block) => block.token.type !== "space");
};

/**
 * The block the caret is in: the last one that starts at or above it. `-1` when the note has no
 * blocks yet, or when the caret sits above the first one.
 */
export const activeBlock = (blocks: readonly Block[], line: number): number => {
  let found = -1;
  for (const [at, block] of blocks.entries()) {
    if (block.line > line) break;
    found = at;
  }
  return found;
};
