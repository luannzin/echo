import { describe, expect, test } from "bun:test";
import { type History, record, redo, startHistory, undo, undoableAt } from "./history";

const at = (text: string): { text: string; caret: number } => ({ text, caret: text.length });
const fresh = (text = ""): History => startHistory(text, text.length);

/** Adds the characters one at a time, a millisecond apart, the way a person in a hurry does. */
const type = (history: History, addition: string, from = 1000): History => {
  let current = history;
  const base = current.present.text;
  for (let n = 1; n <= addition.length; n += 1) {
    current = record(current, at(base + addition.slice(0, n)), from + n);
  }
  return current;
};

describe("record", () => {
  test("a burst of typing is one step, not one per letter", () => {
    const history = type(fresh(), "hello");
    expect(history.present.text).toBe("hello");
    expect(history.past).toHaveLength(1);
    expect(undo(history)?.present.text).toBe("");
  });

  test("a pause ends the step", () => {
    let history = type(fresh(), "hello");
    history = record(history, at("hello world"), 9000);
    expect(undo(history)?.present.text).toBe("hello");
  });

  test("turning from writing to erasing ends the step", () => {
    let history = type(fresh(), "hello");
    history = record(history, at("hell"), 1006);
    history = record(history, at("hel"), 1007);
    // The two deletions are one step of their own, and taking it back leaves the typing intact.
    expect(undo(history)?.present.text).toBe("hello");
  });

  test("erasing a stretch is always its own step", () => {
    let history = type(fresh(), "hello world");
    history = record(history, at("hello"), 1012);
    expect(history.past).toHaveLength(2);
    expect(undo(history)?.present.text).toBe("hello world");
  });

  test("moving the caret is not an edit", () => {
    const history = record(type(fresh(), "hello"), { text: "hello", caret: 0 }, 9000);
    expect(history.past).toHaveLength(1);
    expect(history.present.caret).toBe(0);
  });
});

describe("undo and redo", () => {
  test("walk back and forward over the same steps", () => {
    let history = type(fresh(), "one");
    history = type(history, " two", 5000);

    const back = undo(history);
    expect(back?.present.text).toBe("one");
    const further = back === null ? null : undo(back);
    expect(further?.present.text).toBe("");

    const forward = further === null ? null : redo(further);
    expect(forward?.present.text).toBe("one");
  });

  test("the caret comes back with the words", () => {
    let history = record(fresh(), { text: "hello", caret: 5 }, 1000);
    history = record(history, { text: "hello there", caret: 11 }, 9000);
    expect(undo(history)?.present).toEqual({ text: "hello", caret: 5, at: 1000 });
  });

  test("nothing to take back, and nothing to put forward", () => {
    const empty = fresh("written");
    expect(undo(empty)).toBeNull();
    expect(redo(empty)).toBeNull();
  });

  test("writing after taking something back closes the way forward", () => {
    const history = type(fresh(), "hello");
    const back = undo(history);
    if (back === null) throw new Error("expected a step back");
    expect(redo(back)).not.toBeNull();

    const branched = record(back, at("goodbye"), 9000);
    expect(redo(branched)).toBeNull();
    expect(undo(branched)?.present.text).toBe("");
  });

  test("the history is deep, but not endless", () => {
    let history = fresh();
    // Each one a second apart, so every keystroke is its own step.
    for (let n = 1; n <= 260; n += 1) history = record(history, at("x".repeat(n)), n * 1000);
    expect(history.past).toHaveLength(200);

    let walked = history;
    for (let n = 0; n < 200; n += 1) {
      const back = undo(walked);
      if (back === null) throw new Error(`ran out after ${n}`);
      walked = back;
    }
    expect(undo(walked)).toBeNull();
    expect(walked.present.text).toHaveLength(60);
  });
});

describe("undoableAt", () => {
  test("says when the step it would take back was made", () => {
    const history = record(fresh(), at("hello"), 4200);
    expect(undoableAt(history)).toBe(4200);
  });

  test("says nothing when there is nothing to take back", () => {
    expect(undoableAt(fresh("opened and left alone"))).toBeNull();
  });

  test("moving the caret does not make the step look newer", () => {
    let history = record(fresh(), at("hello"), 4200);
    history = record(history, { text: "hello", caret: 0 }, 9000);
    expect(undoableAt(history)).toBe(4200);
  });
});
