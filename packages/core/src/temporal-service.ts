import type { Mention } from "@echo/parser";
import type { Clock } from "./clock";
import type { StoredMentions, TemporalRepository } from "./ports";
import { currentWeek, type Window } from "./temporal";

export type TemporalService = ReturnType<typeof createTemporalService>;

/** What the notes say about time, as a service, so nothing above the domain touches a repository. */
export const createTemporalService = ({
  repository,
  now,
}: {
  repository: TemporalRepository;
  now: Clock;
}) => ({
  /**
   * Everything pointed *at* the week today falls in. This is what a "now" band is a window onto.
   *
   * A backward-looking fuzzy window is left out. "Recentemente" reaches from a fortnight ago up to
   * today, so it overlaps this week by construction and would sit in the band forever — it describes
   * a stretch the reader was in, where the band is for moments a note pointed at.
   */
  async thisWeek(): Promise<StoredMentions[]> {
    const week = currentWeek(now());
    const found = await repository.inWindow(week.from, week.to);
    return found.flatMap((held) => {
      const pointed = held.mentions.filter(
        (mention) => !(mention.direction === "past" && mention.grain === "fuzzy"),
      );
      return pointed.length > 0 ? [{ ...held, mentions: pointed }] : [];
    });
  },

  inWindow(window: Window): Promise<StoredMentions[]> {
    return repository.inWindow(window.from, window.to);
  },

  of(noteId: string): Promise<Mention[]> {
    return repository.get(noteId);
  },
});
