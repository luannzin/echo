import type { Mention } from "@echo/parser";
import type {
  Category,
  Folder,
  LearningEvent,
  Note,
  NoteCategory,
  Observation,
  ObservationType,
  Task,
} from "@echo/types";

/** Fields a repository may change after insert. Identity and creation time are immutable. */
export type NotePatch = Partial<Pick<Note, "title" | "content" | "folderId" | "archivedAt">> & {
  updatedAt: Date;
};

export type NoteListOptions = {
  /** `undefined` lists every folder, `null` lists the Inbox. */
  folderId?: string | null;
  includeArchived?: boolean;
  /** Absent lists every note. A caller that wants a page has to say how big it is. */
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

export type CategoryPatch = Partial<Pick<Category, "name">> & { updatedAt: Date };

export interface CategoryRepository {
  insert(category: Category): Promise<Category>;
  update(id: string, patch: CategoryPatch): Promise<Category>;
  delete(id: string): Promise<void>;
  /** Named, not by id: creating a category is idempotent on its name. */
  findByName(name: string): Promise<Category | null>;
  list(): Promise<Category[]>;
  /** Every note-to-category row there is. Small enough to hold, and read once per session. */
  assignments(): Promise<NoteCategory[]>;
  /**
   * Returns whether anything changed. An `auto` row may never overwrite a `user` one — that is
   * rule 9 (explicit beats inferred), and it is enforced here because this is the only place both
   * rows are visible at once.
   */
  assign(assignment: NoteCategory): Promise<boolean>;
  unassign(noteId: string, categoryId: string): Promise<void>;
}

export type TaskPatch = Partial<Pick<Task, "title" | "completedAt" | "dueAt">> & {
  updatedAt: Date;
};

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

/** One note's reading of time, and when it was read. */
export type StoredMentions = { noteId: string; mentions: Mention[] };

/**
 * What the notes say about time. Derived data: every row here can be thrown away and rebuilt from
 * the note it came from, which is why the parse marker lives beside the mentions rather than on the
 * note itself — writing to a note to record that it had been read would be an edit nobody made.
 */
export interface TemporalRepository {
  /** One note's mentions, replacing whatever was read from it before. */
  put(noteId: string, mentions: Mention[], parsedAt: Date): Promise<void>;
  /** Notes never read, and notes edited since they were. */
  pending(limit?: number): Promise<string[]>;
  /** Every mention overlapping a window, which is what a "now" band is. */
  inWindow(from: Date, to: Date): Promise<StoredMentions[]>;
  get(noteId: string): Promise<Mention[]>;
}

/**
 * Where the reader has been. Append-only, and never consulted by the learning engine — see
 * `Observation` for why the two logs are separate.
 */
export interface ObservationRepository {
  record(observation: Observation): Promise<void>;
  /** The newest visit per subject, for one type. */
  lastSeen(type: ObservationType): Promise<Map<string, Date>>;
  /** The most recent observations of one type, newest first. Capped: this is a log, not a table. */
  recent(type: ObservationType, limit?: number): Promise<Observation[]>;
}

export type Repositories = {
  notes: NoteRepository;
  folders: FolderRepository;
  categories: CategoryRepository;
  tasks: TaskRepository;
  embeddings: EmbeddingRepository;
  learning: LearningRepository;
  temporal: TemporalRepository;
  observations: ObservationRepository;
};
