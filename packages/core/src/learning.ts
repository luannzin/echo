import { type DerivationOptions, deriveRules, type LearnedRule } from "@echo/learning";
import {
  DEFAULT_WORKSPACE_ID,
  type LearningEvent,
  type LearningEventCreate,
  learningEventCreateSchema,
} from "@echo/types";
import type { Clock, IdFactory } from "./clock";
import type { EventBus } from "./events";
import type { LearningRepository } from "./ports";

export type LearningService = ReturnType<typeof createLearningService>;

/**
 * The reader's corrections, and what echo has worked out from them.
 *
 * Rules are derived on every read rather than stored. It costs one pass over a bounded list of
 * events and buys the property that matters: there is exactly one place a belief about the reader
 * can live, so "forget this" is a delete and not a flag that something else might still consult.
 */
export const createLearningService = ({
  repository,
  events,
  now,
  newId,
}: {
  repository: LearningRepository;
  events: EventBus;
  now: Clock;
  newId: IdFactory;
}) => {
  return {
    async record(input: LearningEventCreate): Promise<LearningEvent> {
      const parsed = learningEventCreateSchema.parse(input);
      const event: LearningEvent = {
        ...parsed,
        id: newId(),
        workspaceId: DEFAULT_WORKSPACE_ID,
        createdAt: now(),
      };
      await repository.record(event);
      events.emit({ type: "learning.recorded", event });
      return event;
    },

    /** Everything echo currently believes, strongest first. */
    async rules(options: DerivationOptions = {}): Promise<LearnedRule[]> {
      return deriveRules(await repository.list(), { now: now(), ...options });
    },

    /** Unlearn one thing. The events go, so the rule cannot be rebuilt from anywhere. */
    async forget(kind: LearningEvent["kind"], subject: string): Promise<void> {
      await repository.forget(kind, subject);
      events.emit({ type: "learning.forgotten", kind, subject });
    },
  };
};
