import { describe, expect, test } from "bun:test";
import { applyCommand, matching, readSlash, SLASH_COMMANDS, type SlashQuery } from "./slash";

const command = (id: string) => {
  const found = SLASH_COMMANDS.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`no command ${id}`);
  return found;
};

/** Reads the slash at the end of `text`, which is where a writer's caret is. */
const read = (text: string): SlashQuery | null => readSlash(text, text.length);

describe("readSlash", () => {
  test("opens at the start of a line and after a space", () => {
    expect(read("/h")).toEqual({ start: 0, name: "h", argument: null });
    expect(read("some words /h")).toEqual({ start: 11, name: "h", argument: null });
    expect(read("first line\n/h")).toEqual({ start: 11, name: "h", argument: null });
  });

  test("a bare slash asks for everything", () => {
    expect(read("/")).toEqual({ start: 0, name: "", argument: null });
  });

  test("stays shut mid-word, where a slash is a date or a path", () => {
    expect(read("06/08")).toBeNull();
    expect(read("packages/core")).toBeNull();
    expect(read("and/or")).toBeNull();
  });

  test("a space closes it, because a sentence is not a command", () => {
    expect(read("/n something")).toBeNull();
    expect(read("/ ")).toBeNull();
  });

  test("except for the commands that take an argument", () => {
    expect(read("/due tomorrow")).toEqual({ start: 0, name: "due", argument: "tomorrow" });
    expect(read("/category deploy notes")).toEqual({
      start: 0,
      name: "category",
      argument: "deploy notes",
    });
    expect(read("/due ")).toEqual({ start: 0, name: "due", argument: "" });
  });

  test("only ever reads the line the caret is on", () => {
    expect(read("/h1 heading\nplain text")).toBeNull();
  });
});

describe("matching", () => {
  test("nothing typed offers everything", () => {
    expect(matching("")).toHaveLength(SLASH_COMMANDS.length);
  });

  test("an exact id leads, whatever else mentions the word", () => {
    expect(matching("code")[0]?.id).toBe("code");
    expect(matching("task")[0]?.id).toBe("task");
  });

  test("finds a command by what it is called in either language", () => {
    expect(matching("titulo").map((c) => c.id)).toContain("h1");
    expect(matching("tarefa").map((c) => c.id)).toContain("todo");
  });

  test("nothing matches nonsense", () => {
    expect(matching("zzzz")).toHaveLength(0);
  });

  test("matches the start of a word, never the middle of one", () => {
    // `h` used to reach the divider and the to-do, which both happen to contain the letter.
    expect(matching("h").map((c) => c.id)).toEqual(["h1", "h2", "h3"]);
    expect(matching("li").map((c) => c.id)).toEqual(["list", "numbered", "divider"]);
  });
});

describe("applyCommand", () => {
  test("a heading writes the hash, not a style", () => {
    const text = "/h1";
    const query = read(text);
    if (query === null) throw new Error("expected a query");
    expect(applyCommand(text, query, text.length, command("h1"))).toEqual({
      text: "# ",
      caret: 2,
    });
  });

  test("the prefix goes on the line, wherever on it the command was typed", () => {
    const text = "already writing /h2";
    const query = read(text);
    if (query === null) throw new Error("expected a query");
    expect(applyCommand(text, query, text.length, command("h2"))).toEqual({
      text: "## already writing ",
      caret: 19,
    });
  });

  test("asking twice does not stack it", () => {
    const text = "# a heading /h1";
    const query = read(text);
    if (query === null) throw new Error("expected a query");
    expect(applyCommand(text, query, text.length, command("h1")).text).toBe("# a heading ");
  });

  test("a block replaces the command and puts the caret inside it", () => {
    const text = "before\n/code";
    const query = read(text);
    if (query === null) throw new Error("expected a query");
    const applied = applyCommand(text, query, text.length, command("code"));
    expect(applied.text).toBe("before\n```\n\n```\n");
    expect(applied.text.slice(applied.caret, applied.caret + 1)).toBe("\n");
  });

  test("a note command takes its own words away and leaves the rest alone", () => {
    const text = "ship the parser /due friday";
    const query = read(text);
    if (query === null) throw new Error("expected a query");
    expect(applyCommand(text, query, text.length, command("due"))).toEqual({
      text: "ship the parser ",
      caret: 16,
    });
  });

  test("what came after the caret survives", () => {
    const text = "/h1 and the rest";
    const query = readSlash(text, 3);
    if (query === null) throw new Error("expected a query");
    expect(applyCommand(text, query, 3, command("h1")).text).toBe("#  and the rest");
  });
});
