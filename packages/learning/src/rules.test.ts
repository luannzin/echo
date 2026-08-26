import { expect, test } from "bun:test";
import { DEFAULT_WORKSPACE_ID, type LearningEvent } from "@echo/types";
import { adjust, affinity, CONFIDENT, deriveRules, dismissed, ruleFor } from "./rules";

const NOW = new Date(2026, 7, 26, 12, 0, 0);
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

let sequence = 0;
const event = (partial: Partial<LearningEvent> & Pick<LearningEvent, "type">): LearningEvent => {
  sequence += 1;
  return {
    id: `00000000-0000-0000-0000-${String(sequence).padStart(12, "0")}`,
    workspaceId: DEFAULT_WORKSPACE_ID,
    kind: "task-phrase",
    subject: "preciso",
    noteId: null,
    createdAt: NOW,
    ...partial,
  };
};

test("one correction is a coincidence, two are a rule", () => {
  const once = deriveRules([event({ type: "signal_rejected" })], { now: NOW });
  expect(once[0]?.outcome).toBe("reject");
  expect(once[0]?.confidence).toBeLessThan(CONFIDENT);

  const twice = deriveRules(
    [event({ type: "signal_rejected" }), event({ type: "signal_rejected" })],
    { now: NOW },
  );
  expect(twice[0]?.confidence).toBeGreaterThan(CONFIDENT);
});

test("corrections in one direction flip the suggestion", () => {
  const phrase = "lembrar de";
  const detected = 0.75;

  const accepting = deriveRules(
    Array.from({ length: 3 }, () => event({ type: "signal_accepted", subject: phrase })),
    { now: NOW },
  );
  expect(adjust(detected, ruleFor(accepting, "task-phrase", phrase))).toBeGreaterThan(detected);

  const rejecting = deriveRules(
    Array.from({ length: 3 }, () => event({ type: "signal_rejected", subject: phrase })),
    { now: NOW },
  );
  const suppressed = adjust(detected, ruleFor(rejecting, "task-phrase", phrase));
  expect(suppressed).toBeLessThan(detected);
  expect(suppressed).toBeLessThan(0.35);
});

test("a reader who changes their mind is followed, not argued with", () => {
  const rules = deriveRules(
    [
      event({ type: "signal_accepted", createdAt: daysAgo(120) }),
      event({ type: "signal_accepted", createdAt: daysAgo(120) }),
      event({ type: "signal_accepted", createdAt: daysAgo(120) }),
      event({ type: "signal_rejected", createdAt: daysAgo(1) }),
      event({ type: "signal_rejected", createdAt: NOW }),
    ],
    { now: NOW },
  );

  expect(rules[0]?.outcome).toBe("reject");
  expect(rules[0]?.support).toBe(5);
});

test("nothing learned changes nothing detected", () => {
  expect(adjust(0.8, undefined)).toBe(0.8);
  // A phrase echo has never seen a correction about is left exactly as the parser read it.
  expect(adjust(0.8, ruleFor(deriveRules([], { now: NOW }), "task-phrase", "preciso"))).toBe(0.8);
});

test("a rule never invents a signal that was not detected", () => {
  const rules = deriveRules(
    Array.from({ length: 10 }, () => event({ type: "signal_accepted" })),
    { now: NOW },
  );
  expect(adjust(0, ruleFor(rules, "task-phrase", "preciso"))).toBe(0);
});

test("phrases and notes never collide, even under the same name", () => {
  const rules = deriveRules(
    [
      event({ type: "signal_rejected", kind: "task-phrase", subject: "shared" }),
      event({ type: "signal_rejected", kind: "task-phrase", subject: "shared" }),
      event({ type: "result_opened", kind: "note", subject: "shared" }),
      event({ type: "result_opened", kind: "note", subject: "shared" }),
    ],
    { now: NOW },
  );

  expect(ruleFor(rules, "task-phrase", "shared")?.outcome).toBe("reject");
  expect(ruleFor(rules, "note", "shared")?.outcome).toBe("accept");
  expect(affinity(rules, "shared")).toBeGreaterThan(CONFIDENT);
});

test("a duplicate waved away stays away", () => {
  const noteId = "3f4b0f6c-6f6d-4a1e-9d2b-2e0a1c9d5b77";
  const rules = deriveRules(
    [event({ type: "duplicate_dismissed", kind: "duplicate", subject: noteId })],
    { now: NOW },
  );

  expect(dismissed(rules, noteId)).toBe(true);
  expect(dismissed(rules, "b0d4d0d0-0000-4000-8000-000000000000")).toBe(false);
});

test("the same events derive the same rules, in the same order", () => {
  const events = [
    event({ type: "signal_accepted", subject: "todo" }),
    event({ type: "signal_rejected", subject: "should" }),
    event({ type: "signal_rejected", subject: "should" }),
  ];
  expect(JSON.stringify(deriveRules(events, { now: NOW }))).toBe(
    JSON.stringify(deriveRules([...events].reverse(), { now: NOW })),
  );
});
