import {
  DEFAULT_WORKSPACE_ID,
  type Note,
  type NoteCreate,
  type NoteUpdate,
  noteCreateSchema,
  noteUpdateSchema,
} from "@echo/types";
import type { Clock, IdFactory } from "./clock";
import type { EventBus } from "./events";
import type { NoteListOptions, NotePatch, NoteRepository } from "./ports";
import { deriveTitle } from "./title";

export type NoteService = ReturnType<typeof createNoteService>;

export function createNoteService({
  repository,
  events,
  now,
  newId,
}: {
  repository: NoteRepository;
  events: EventBus;
  now: Clock;
  newId: IdFactory;
}) {
  async function mustGet(id: string): Promise<Note> {
    const note = await repository.get(id);
    if (!note) throw new Error(`Note ${id} not found`);
    return note;
  }

  return {
    async create(input: NoteCreate = {}): Promise<Note> {
      const { id, content, folderId } = noteCreateSchema.parse(input);
      const timestamp = now();
      const note = await repository.insert({
        id: id ?? newId(),
        workspaceId: DEFAULT_WORKSPACE_ID,
        folderId,
        title: deriveTitle(content),
        content,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      events.emit({ type: "note.created", note });
      return note;
    },

    async update(id: string, input: NoteUpdate): Promise<Note> {
      const update = noteUpdateSchema.parse(input);
      const previous = await mustGet(id);

      const patch: NotePatch = { updatedAt: now() };
      if (update.content !== undefined) {
        patch.content = update.content;
        patch.title = deriveTitle(update.content);
      }
      if (update.folderId !== undefined) patch.folderId = update.folderId;
      if (update.archivedAt !== undefined) patch.archivedAt = update.archivedAt;

      const note = await repository.update(id, patch);
      events.emit({ type: "note.updated", note, previous });
      if (update.folderId !== undefined && update.folderId !== previous.folderId) {
        events.emit({ type: "note.moved", note, previousFolderId: previous.folderId });
      }
      return note;
    },

    /** Autosave path: content only, and a no-op write never touches the row or the event bus. */
    async saveContent(id: string, content: string): Promise<Note> {
      const previous = await mustGet(id);
      if (previous.content === content) return previous;
      return this.update(id, { content });
    },

    move(id: string, folderId: string | null): Promise<Note> {
      return this.update(id, { folderId });
    },

    archive(id: string): Promise<Note> {
      return this.update(id, { archivedAt: now() });
    },

    restore(id: string): Promise<Note> {
      return this.update(id, { archivedAt: null });
    },

    async delete(id: string): Promise<void> {
      await repository.delete(id);
      events.emit({ type: "note.deleted", noteId: id });
    },

    get(id: string): Promise<Note | null> {
      return repository.get(id);
    },

    list(options?: NoteListOptions): Promise<Note[]> {
      return repository.list(options);
    },
  };
}
