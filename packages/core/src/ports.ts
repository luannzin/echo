import type { Folder, LearningEvent, Note, Task } from "@echo/types";

/** Fields a repository may change after insert. Identity and creation time are immutable. */
export type NotePatch = Partial<Pick<Note, "title" | "content" | "folderId" | "archivedAt">> & {
  updatedAt: Date;
};

export type NoteListOptions = {
  /** `undefined` lists every folder, `null` lists the Inbox. */
  folderId?: string | null;
  includeArchived?: boolean;
  limit?: number;
};

export interface NoteRepository {
  insert(note: Note): Promise<Note>;
  update(id: string, patch: NotePatch): Promise<Note>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<Note | null>;
  list(options?: NoteListOptions): Promise<Note[]>;
}

export type FolderPatch = Partial<Pick<Folder, "name" | "parentId">> & { updatedAt: Date };

export interface FolderRepository {
  insert(folder: Folder): Promise<Folder>;
  update(id: string, patch: FolderPatch): Promise<Folder>;
  /** Children are removed with the parent; notes inside fall back to the Inbox. */
  delete(id: string): Promise<void>;
  get(id: string): Promise<Folder | null>;
  list(): Promise<Folder[]>;
}

export type TaskPatch = Partial<Pick<Task, "title" | "completedAt">> & { updatedAt: Date };

export interface TaskRepository {
  insert(task: Task): Promise<Task>;
  update(id: string, patch: TaskPatch): Promise<Task>;
  delete(id: string): Promise<void>;
  get(id: string): Promise<Task | null>;
  /** Due soonest first, undated last. Ordering belongs here, not in whatever renders it. */
  list(): Promise<Task[]>;
}

export type StoredEmbedding = {
  noteId: string;
  model: string;
  values: Float32Array;
};

export interface EmbeddingRepository {
  put(embedding: StoredEmbedding): Promise<void>;
  list(model: string): Promise<StoredEmbedding[]>;
  /** Notes with no vector, a stale vector, or one from a different model. */
  pending(model: string): Promise<string[]>;
}

export type LexicalMatch = { noteId: string; rank: number };

export interface LexicalSearch {
  search(query: string, limit?: number): Promise<LexicalMatch[]>;
}

/**
 * Corrections are append-only, and forgetting is a delete rather than a flag: a reader who asks
 * echo to unlearn something must be able to see it gone.
 */
export interface LearningRepository {
  record(event: LearningEvent): Promise<void>;
  /** Newest first. The limit exists so deriving rules stays a bounded piece of work. */
  list(limit?: number): Promise<LearningEvent[]>;
  forget(kind: LearningEvent["kind"], subject: string): Promise<void>;
}

export type Repositories = {
  notes: NoteRepository;
  folders: FolderRepository;
  tasks: TaskRepository;
  embeddings: EmbeddingRepository;
  learning: LearningRepository;
};
