import { DEFAULT_WORKSPACE_ID, type Observation, type ObservationType } from "@echo/types";
import type { Clock, IdFactory } from "./clock";
import type { ObservationRepository } from "./ports";

export type ObservationService = ReturnType<typeof createObservationService>;

/**
 * A repeat inside this window is the same visit: clicking a folder, opening a note in it and
 * clicking back is one look at the project, not three.
 */
const SAME_VISIT_MS = 5 * 60 * 1000;

/**
 * Where the reader has been. Append-only, and pointedly not part of the learning engine: rules are
 * derived from corrections, and a visit is not a correction. Walking around the app must not teach
 * echo things nobody said.
 */
export const createObservationService = ({
  repository,
  now,
  newId,
}: {
  repository: ObservationRepository;
  now: Clock;
  newId: IdFactory;
}) => {
  /** The last visit per subject, so recording one never costs a read. */
  const latest = new Map<string, Date>();
  let loaded: Promise<void> | undefined;

  const load = (type: ObservationType): Promise<void> => {
    loaded ??= repository.lastSeen(type).then((seen) => {
      for (const [subject, at] of seen) latest.set(`${type}:${subject}`, at);
    });
    return loaded;
  };

  return {
    /**
     * Records a visit and returns the one before it — which is the moment "what changed" is measured
     * against. Returning it from the same call is what stops the caller from recording first and
     * then asking a baseline that its own write has already moved.
     */
    async seen(type: ObservationType, subject: string): Promise<Date | null> {
      await load(type);
      const key = `${type}:${subject}`;
      const previous = latest.get(key) ?? null;
      const at = now();

      if (previous && at.getTime() - previous.getTime() < SAME_VISIT_MS) return previous;

      const observation: Observation = {
        id: newId(),
        workspaceId: DEFAULT_WORKSPACE_ID,
        type,
        subject,
        at,
      };
      latest.set(key, at);
      await repository.record(observation);
      return previous;
    },

    /** The last visit to each subject, without recording one. */
    async lastSeen(type: ObservationType): Promise<Map<string, Date>> {
      await load(type);
      const seen = new Map<string, Date>();
      for (const [key, at] of latest) {
        const [heldType, ...rest] = key.split(":");
        if (heldType === type) seen.set(rest.join(":"), at);
      }
      return seen;
    },
  };
};
