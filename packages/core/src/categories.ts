import {
  type Category,
  type CategoryCreate,
  type CategorySource,
  categoryCreateSchema,
  DEFAULT_WORKSPACE_ID,
  type NoteCategory,
} from "@echo/types";
import type { Clock, IdFactory } from "./clock";
import type { EventBus } from "./events";
import type { CategoryRepository } from "./ports";

export type CategoryService = ReturnType<typeof createCategoryService>;

/** Two categories differing only in case or spacing are one category the reader keeps re-choosing. */
export const normalizeCategoryName = (name: string): string => name.trim().replace(/\s+/g, " ");

export const createCategoryService = ({
  repository,
  events,
  now,
  newId,
}: {
  repository: CategoryRepository;
  events: EventBus;
  now: Clock;
  newId: IdFactory;
}) => {
  return {
    /**
     * The same name twice returns what is already there. Naming a category is something a reader
     * does mid-sentence — from a note, from the palette, from the pane — and three surfaces racing
     * to create the same label must not end with three labels.
     */
    async create(input: CategoryCreate): Promise<Category> {
      const { name } = categoryCreateSchema.parse(input);
      const normalized = normalizeCategoryName(name);
      const existing = await repository.findByName(normalized);
      if (existing) return existing;

      const timestamp = now();
      const category = await repository.insert({
        id: newId(),
        workspaceId: DEFAULT_WORKSPACE_ID,
        name: normalized,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      events.emit({ type: "category.created", category });
      return category;
    },

    async rename(id: string, name: string): Promise<Category> {
      const category = await repository.update(id, {
        name: normalizeCategoryName(name),
        updatedAt: now(),
      });
      events.emit({ type: "category.renamed", category });
      return category;
    },

    /** The notes keep everything else about themselves; only the label goes. */
    async delete(id: string): Promise<void> {
      await repository.delete(id);
      events.emit({ type: "category.deleted", categoryId: id });
    },

    list(): Promise<Category[]> {
      return repository.list();
    },

    /** Every note's categories, in one read. The screen holds them; nothing looks them up per row. */
    assignments(): Promise<NoteCategory[]> {
      return repository.assignments();
    },

    /**
     * Puts a category on a note. A reader's own choice may replace echo's reading of the note; the
     * reverse is refused in the repository, which is where rule 9 has to live to be true.
     */
    async assign(
      noteId: string,
      categoryId: string,
      source: CategorySource = "user",
    ): Promise<void> {
      const assignment: NoteCategory = { noteId, categoryId, source, createdAt: now() };
      const written = await repository.assign(assignment);
      if (written) events.emit({ type: "note.categorized", assignment });
    },

    async unassign(noteId: string, categoryId: string): Promise<void> {
      await repository.unassign(noteId, categoryId);
      events.emit({ type: "note.uncategorized", noteId, categoryId });
    },
  };
};
